// SPDX-License-Identifier: MIT
// Token Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)
// Koinos Group, Inc. (contact@koinos.group)

import { Arrays, authority, chain, error, kcs4, Protobuf, Storage, System, token, vhp } from "@koinos/sdk-as";

/**
 * To prevent exploiting the PoB algorithm, the VHP has a "delayed" transfer system built in.
 * Rather, this system does not delay property rights transferral, but delays the VHP from
 * being counted towards an address for block production. Increases the balance are delayed
 * while decreases are instantaneous.
 *
 * Calculating and storing this information uses rolling snapshots. This approach only works
 * because we are only interested in a short period of history (20 blocks). Each balance has a
 * list of previous snapshots by block height and balance. When we increase the balance, we
 * store the new balance as a snapshot with the current head block height. When we decrease
 * the balance on all snapshots.
 *
 * We also need to clean up the snapshots. We want at most one snapshot earlier than 20 blocks.
 * So we trim all but the most recent snapshot older than 20 blocks. Then, when we want to
 * retrieve the effective balance, we just have to find the most recent snapshot older than
 * 20 blocks.
 *
 * All balance objects will "decay" back to the current balance and the snapshot equal to the
 * current balance.
 *
 * The trick to making the algorithms on the snapshots efficient is that new snapshots are
 * pushed to the back of the array and old snapshots are removed from the front.
 */

const SUPPLY_SPACE_ID = 0;
const BALANCES_SPACE_ID = 1;
const ALLOWANCES_SPACE_ID = 2;

namespace Detail {
  let zone: Uint8Array = new Uint8Array(0);

  export function Zone(): Uint8Array {
    if (zone.length == 0) {
      // 1AdzuXSpC6K9qtXdCBgD5NUpDNwHjMgrc9
      zone = new Uint8Array(25);
      zone.set([0x00, 0x69, 0xb8, 0x71, 0x9f, 0x8b, 0x59, 0x2a, 0xe1, 0xc3, 0xeb, 0x8d, 0xed, 0x2d, 0xd4, 0xdb, 0x7c, 0x6f, 0x91, 0x5c, 0x0c, 0xca, 0x69, 0xe5, 0x72]);
    }

    return zone;
  }
}

export class Vhp {
  _name: string = "Virtual Hash Power";
  _symbol: string = "VHP";
  _decimals: u32 = 8;
  _delay_blocks: u64 = 20;

  contractId: Uint8Array = System.getContractId();

  supply: Storage.Obj< kcs4.balance_object > = new Storage.Obj(
    Detail.Zone(),
    SUPPLY_SPACE_ID,
    kcs4.balance_object.decode,
    kcs4.balance_object.encode,
    () => new kcs4.balance_object(),
    true
  );

  balances: Storage.Map< Uint8Array, vhp.effective_balance_object > = new Storage.Map(
    Detail.Zone(),
    BALANCES_SPACE_ID,
    vhp.effective_balance_object.decode,
    vhp.effective_balance_object.encode,
    () => new vhp.effective_balance_object(),
    true
  );

  allowances: Storage.Map< Uint8Array, kcs4.allowance_object > = new Storage.Map(
    Detail.Zone(),
    ALLOWANCES_SPACE_ID,
    kcs4.allowance_object.decode,
    kcs4.allowance_object.encode,
    () => new kcs4.allowance_object(),
    true
  );

  name(): kcs4.name_result {
    return new kcs4.name_result(this._name);
  }

  symbol(): kcs4.symbol_result {
    return new kcs4.symbol_result(this._symbol);
  }

  decimals(): kcs4.decimals_result {
    return new kcs4.decimals_result(this._decimals);
  }

  get_info(): kcs4.get_info_result {
    return new kcs4.get_info_result(this._name, this._symbol, this._decimals);
  }

  total_supply(): kcs4.total_supply_result {
    return new kcs4.total_supply_result(this.supply.get());
  }

  balance_of(args: kcs4.balance_of_arguments): kcs4.balance_of_result {
    return new kcs4.balance_object(this.balances.get(args.owner).current_balance);
  }

  effective_balance_of(args: vhp.effective_balance_of_arguments): vhp.effective_balance_of_result {
    let effectiveBalances = this.balances.get(args.owner);

    if (effectiveBalances.past_balances.length == 0) {
      return new vhp.effective_balance_of_result(effectiveBalances.current_balance);
    }

    this._trim_balances(effectiveBalances, System.getBlockField("header.height")!.uint64_value);
    return new vhp.effective_balance_of_result(effectiveBalances.past_balances[0].balance);
  }

  allowance(args: kcs4.allowance_args): kcs4.allowance_result {
    System.require(args.owner != null, "allowance argument 'owner' cannot be null");
    System.require(args.spender != null, "allowance argument 'spender' cannot be null");

    let allowanceKey = new kcs4.allowance_key(args.owner!, args.spender!);
    let allowanceKeyBytes = Protobuf.encode(allowanceKey, kcs4.allowance_key.encode);
    return new kcs4.allowance_result(this.allowances.get(allowanceKeyBytes).value);
  }

  get_allowances(args: kcs4.get_allowances_args): kcs4.get_allowances_result {
    System.require(args.owner != null, 'owner cannot be null');

    let allowanceKey = new kcs4.allowance_key(args.owner, args.spender);
    let allowanceKeyBytes = Protobuf.encode(allowanceKey, kcs4.allowance_key.encode);
    let result = new kcs4.get_allownaces_return(args.owner, []);

    for (let i = 0; i < args.limit; i++) {
      const nextAllowance = args.descending
        ? this.allowances.getPrev(allowanceKeyBytes)
        : this.allowances.getNext(allowanceKeyBytes);

      if (!nextAllowance) {
        break;
      }

      allowanceKey = Protobuf.decode(nextAllowance.key!, kcs4.allowance_key.decode);

      if (!Arrays.equal(allowanceKey.owner, args.owner)) {
        break;
      }

      result.allowances.push(
        new kcs4.spender_value(allowanceKey.spender, nextAllowance.value)
      );
      allowanceKeyBytes = nextAllowance.key!;
    }

    return result;
  }

  transfer(args: kcs4.transfer_arguments): kcs4.transfer_result {
    System.require(args.to != null, "transfer argument 'to' cannot be null");
    System.require(args.from != null, "transfer argument 'from' cannot be null");
    System.require(!Arrays.equal(args.from, args.to), 'cannot transfer to yourself');

    System.require(
      this._check_authority(args.from, args.value),
      'from has not authorized transfer',
      error.error_code.authorization_failure
    );

    let fromBalance = this.balances.get(args.from);
    System.require(fromBalance.current_balance >= args.value, "account 'from' has insufficient balance", error.error_code.failure);

    let toBalance = this.balances.get(args.to);

    let blockHeight = System.getBlockField("header.height")!.uint64_value;
    this._decrease_balance_by(fromBalance, blockHeight, args.value);
    this._increase_balance_by(toBalance, blockHeight, args.value);

    this.balances.put(args.from, fromBalance);
    this.balances.put(args.to, toBalance);

    System.event(
      'koinos.contracts.kcs4.transfer_event',
      Protobuf.encode(new kcs4.transfer_event(args.from, args.to, args.value, args.memo), kcs4.transfer_event.encode),
      [args.to, args.from]
    );

    return new kcs4.transfer_result();
  }

  mint(args: kcs4.mint_arguments): kcs4.mint_result {
    System.require(args.to != null, "mint argument 'to' cannot be null");
    System.require(args.value != 0, "mint argument 'value' cannot be zero");

    if (System.getCaller().caller_privilege != chain.privilege.kernel_mode) {
      if (BUILD_FOR_TESTING) {
        System.requireAuthority(authority.authorization_type.contract_call, System.getContractId());
      }
      else {
        System.fail('insufficient privileges to mint', error.error_code.authorization_failure);
      }
    }

    let supply = this.supply.get();
    System.require(supply.value <= u64.MAX_VALUE - args.value, 'mint would overflow supply', error.error_code.failure);

    let balance = this.balances.get(args.to);

    this._increase_balance_by(balance, System.getBlockField("header.height")!.uint64_value, args.value);
    supply.value += args.value;

    this.supply.put(supply);
    this.balances.put(args.to, balance);

    System.event(
      'koinos.contracts.kcs4.mint_event',
      Protobuf.encode(new kcs4.mint_event(args.to, args.value), kcs4.mint_event.encode),
      [args.to]
    );

    return new kcs4.mint_result();
  }

  burn(args: kcs4.burn_arguments): kcs4.burn_result {
    System.require(args.from != null, "burn argument 'from' cannot be null");

    let callerData = System.getCaller();
    System.require(
      callerData.caller_privilege == chain.privilege.kernel_mode || this._check_authority(args.from, args.value),
      'from has not authorized burn',
      error.error_code.authorization_failure
    );

    let fromBalance = this.balances.get(args.from);
    System.require(fromBalance.current_balance >= args.value, "account 'from' has insufficient balance", error.error_code.failure);

    let supply = this.supply.get()
    System.require(supply.value >= args.value, 'burn would underflow supply', error.error_code.failure);

    supply.value -= args.value;
    this._decrease_balance_by(fromBalance, System.getBlockField("header.height")!.uint64_value, args.value);

    this.supply.put(supply);
    this.balances.put(args.from, fromBalance);

    System.event(
      'koinos.contracts.kcs4.burn_event',
      Protobuf.encode(new kcs4.burn_event(args.from, args.value), kcs4.burn_event.encode),
      [args.from]
    );

    return new kcs4.burn_result();
  }

  approve(args: kcs4.approve_arguments): kcs4.approve_result {
    System.require(args.owner != null, "approve argument 'owner' cannot be null");
    System.require(args.spender != null, "approve argument 'spender' cannot be null");
    System.require(
      System.checkAuthority(authority.authorization_type.contract_call, args.owner!),
      'owner has not authorized approval',
      error.error_code.authorization_failure
    );

    let allowanceKey = new kcs4.allowance_key(args.owner!, args.spender!);
    let allowanceKeyBytes = Protobuf.encode(allowanceKey, kcs4.allowance_key.encode);
    this.allowances.put(allowanceKeyBytes, new kcs4.allowance_object(args.value));

    System.event(
      "koinos.contracts.kcs4.approve",
      Protobuf.encode(new kcs4.approve_event(args.owner, args.spender, args.value), kcs4.approve_event.encode),
      [args.owner, args.spender]
    );
  }

  _check_authority(account: Uint8Array, amount: u64): boolean {
    const caller = System.getCaller().caller;
    if (caller && caller.length > 0) {
      let allowanceKey = new kcs4.allowance_key(account, caller);
      let allowanceKeyBytes = Protobuf.encode(allowanceKey, kcs4.allowance_key.encode);
      const allowance = this.allowances.get(allowanceKeyBytes);
      if (allowance.value >= amount) {
        allowance.value -= amount;
        this.allowances.put(allowanceKeyBytes, allowance);
        return true;
      }
    }

    return System.checkAuthority(authority.authorization_type.contract_call, account);
  }

  _increase_balance_by(balanceObj: vhp.effective_balance_object, blockHeight: u64, value: u64): void {
    this._trim_balances(balanceObj, blockHeight);

    let snapshotLength = balanceObj.past_balances.length;

    if (snapshotLength == 0) {
      balanceObj.past_balances.push(new vhp.balance_entry(blockHeight - 1, balanceObj.current_balance));
      snapshotLength = 1;
    }

    let newBalance = balanceObj.current_balance + value;
    balanceObj.current_balance = newBalance;

    // If there is no entry for this block's balance, set it.
    // Otherwise, push it to the back
    if (balanceObj.past_balances[snapshotLength - 1].block_height != blockHeight ) {
      balanceObj.past_balances.push(new vhp.balance_entry(blockHeight, newBalance));
    }
    else {
      balanceObj.past_balances[snapshotLength - 1].balance = newBalance;
    }
  }

  _decrease_balance_by(balanceObj: vhp.effective_balance_object, blockHeight: u64, value: u64): void {
    this._trim_balances(balanceObj, blockHeight);

    balanceObj.current_balance -= value;

    for (let i = 0; i < balanceObj.past_balances.length; i++ ) {
      if (balanceObj.past_balances[i].balance < value) {
        balanceObj.past_balances[i].balance = 0;
      } else {
        balanceObj.past_balances[i].balance -= value;
      }
    }
  }

  _trim_balances(balanceObj: vhp.effective_balance_object, blockHeight: u64): void {
    if (balanceObj.past_balances.length <= 1)
      return;

    let limitBlock = blockHeight - this._delay_blocks;

    if (blockHeight < this._delay_blocks) {
      limitBlock = 0;
    }

    while( balanceObj.past_balances.length > 1 && balanceObj.past_balances[1].block_height <= limitBlock ) {
      balanceObj.past_balances.shift();
    }
  }
}
