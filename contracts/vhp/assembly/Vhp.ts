// SPDX-License-Identifier: MIT
// VHP Contract
// Julian Gonzalez (joticajulian@gmail.com)
// Koinos Group, Inc. (contact@koinos.group)

import { Arrays, authority, chain, error, kcs4, Protobuf, Storage, System } from "@koinos/sdk-as";
import { vhp } from "./proto/vhp";

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
      zone = new Uint8Array(25);
      if (BUILD_FOR_TESTING) {
        // 17n12ktwN79sR6ia9DDgCfmw77EgpbTyBi
        zone.set([0x00, 0x4a, 0x53, 0x7f, 0x8e, 0x7d, 0x84, 0x0c, 0x14, 0xb0, 0xe9, 0x75, 0x8d, 0xcd, 0x91, 0x0c, 0xc6, 0xec, 0x42, 0xea, 0x89, 0xc7, 0x74, 0xb5, 0x1d]);
      } else {
        // 1AdzuXSpC6K9qtXdCBgD5NUpDNwHjMgrc9
        zone.set([0x00, 0x69, 0xb8, 0x71, 0x9f, 0x8b, 0x59, 0x2a, 0xe1, 0xc3, 0xeb, 0x8d, 0xed, 0x2d, 0xd4, 0xdb, 0x7c, 0x6f, 0x91, 0x5c, 0x0c, 0xca, 0x69, 0xe5, 0x72]);
      }
    }

    return zone;
  }
}

export class Vhp {
  _name: string = "Virtual Hash Power";
  _symbol: string = "VHP";
  _decimals: u32 = 8;
  _delay_blocks: u64 = 20;

  supply: Storage.Obj< vhp.balance_object > = new Storage.Obj(
    Detail.Zone(),
    SUPPLY_SPACE_ID,
    vhp.balance_object.decode,
    vhp.balance_object.encode,
    () => new vhp.balance_object(),
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

  allowances: Storage.Map< Uint8Array, vhp.balance_object > = new Storage.Map(
    Detail.Zone(),
    ALLOWANCES_SPACE_ID,
    vhp.balance_object.decode,
    vhp.balance_object.encode,
    () => new vhp.balance_object(),
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
    return new kcs4.total_supply_result(this.supply.get()!.value);
  }

  balance_of(args: kcs4.balance_of_arguments): kcs4.balance_of_result {
    return new kcs4.balance_of_result(this.balances.get(args.owner)!.current_balance);
  }

  effective_balance_of(args: vhp.effective_balance_of_arguments): vhp.effective_balance_of_result {
    System.require(args.owner != null, "account 'owner' cannot be null");
    let effectiveBalances = this.balances.get(args.owner!)!;

    if (effectiveBalances.past_balances.length == 0) {
      return new vhp.effective_balance_of_result(effectiveBalances.current_balance);
    }

    this._trim_balances(effectiveBalances, System.getBlockField("header.height")!.uint64_value);
    return new vhp.effective_balance_of_result(effectiveBalances.past_balances[0].balance);
  }

  allowance(args: kcs4.allowance_arguments): kcs4.allowance_result {
    System.require(args.owner != null, "account 'owner' cannot be null");
    System.require(args.spender != null, "account 'spender' cannot be null");

    const key = new Uint8Array(50);
    key.set(args.owner, 0);
    key.set(args.spender, 25);

    return new kcs4.allowance_result(this.allowances.get(key)!.value);
  }

  get_allowances(args: kcs4.get_allowances_arguments): kcs4.get_allowances_result {
    System.require(args.owner != null, "account 'owner' cannot be null");

    let key = new Uint8Array(50);
    key.set(args.owner, 0);
    key.set(args.start ? args.start : new Uint8Array(0), 25);

    let result = new kcs4.get_allowances_result(args.owner, []);

    for (let i = 0; i < args.limit; i++) {
      const nextAllowance = args.descending
        ? this.allowances.getPrev(key)
        : this.allowances.getNext(key);

      if (!nextAllowance) {
        break;
      }

      if (!Arrays.equal(args.owner, nextAllowance.key!.slice(0, 25))) {
        break;
      }

      result.allowances.push(
        new kcs4.spender_value(nextAllowance.key!.slice(25), nextAllowance.value.value)
      );

      key = nextAllowance.key!;
    }

    return result;
  }

  transfer(args: kcs4.transfer_arguments): kcs4.transfer_result {
    System.require(args.to != null, "account 'to' cannot be null");
    System.require(args.from != null, "account 'from' cannot be null");
    System.require(!Arrays.equal(args.from, args.to), 'cannot transfer to yourself');

    System.require(
      this._check_authority(args.from, args.value),
      "account 'from' has not authorized transfer",
      error.error_code.authorization_failure
    );

    let fromBalance = this.balances.get(args.from)!;
    System.require(fromBalance.current_balance >= args.value, "account 'from' has insufficient balance", error.error_code.failure);

    let toBalance = this.balances.get(args.to)!;
    let blockHeight = System.getBlockField("header.height")!.uint64_value;
    this._decrease_balance_by(fromBalance, blockHeight, args.value);
    this._increase_balance_by(toBalance, blockHeight, args.value);

    this.balances.put(args.from, fromBalance);
    this.balances.put(args.to, toBalance);

    System.event(
      'token.transfer_event',
      System.getArguments().args,
      [args.to, args.from]
    );

    return new kcs4.transfer_result();
  }

  mint(args: kcs4.mint_arguments): kcs4.mint_result {
    System.require(args.to != null, "account 'to' cannot be null");
    System.require(args.value != 0, "argument 'value' cannot be zero");

    if (System.getCaller().caller_privilege != chain.privilege.kernel_mode) {
      if (BUILD_FOR_TESTING) {
        System.requireAuthority(authority.authorization_type.contract_call, System.getContractId());
      }
      else {
        System.fail('insufficient privileges to mint', error.error_code.authorization_failure);
      }
    }

    let supply = this.supply.get()!;
    System.require(supply.value <= u64.MAX_VALUE - args.value, 'mint would overflow supply', error.error_code.failure);

    let balance = this.balances.get(args.to)!;

    this._increase_balance_by(balance, System.getBlockField("header.height")!.uint64_value, args.value);
    supply.value += args.value;

    this.supply.put(supply);
    this.balances.put(args.to, balance);

    System.event(
      'token.mint_event',
      System.getArguments().args,
      [args.to]
    );

    return new kcs4.mint_result();
  }

  burn(args: kcs4.burn_arguments): kcs4.burn_result {
    System.require(args.from != null, "account 'from' cannot be null");

    let callerData = System.getCaller();
    System.require(
      callerData.caller_privilege == chain.privilege.kernel_mode || this._check_authority(args.from, args.value),
      "account 'from' has not authorized burn",
      error.error_code.authorization_failure
    );

    let fromBalance = this.balances.get(args.from)!;
    System.require(fromBalance.current_balance >= args.value, "account 'from' has insufficient balance", error.error_code.failure);

    let supply = this.supply.get()!;
    System.require(supply.value >= args.value, 'burn would underflow supply', error.error_code.failure);

    supply.value -= args.value;
    this._decrease_balance_by(fromBalance, System.getBlockField("header.height")!.uint64_value, args.value);

    this.supply.put(supply);
    this.balances.put(args.from, fromBalance);

    System.event(
      'token.burn_event',
      System.getArguments().args,
      [args.from]
    );

    return new kcs4.burn_result();
  }

  approve(args: kcs4.approve_arguments): kcs4.approve_result {
    System.require(args.owner != null, "account 'owner' cannot be null");
    System.require(args.spender != null, "account 'spender' cannot be null");
    System.requireAuthority(authority.authorization_type.contract_call, args.owner);

    const key = new Uint8Array(50);
    key.set(args.owner, 0);
    key.set(args.spender, 25);
    this.allowances.put(key, new vhp.balance_object(args.value));

    System.event(
      "token.approve_event",
      System.getArguments().args,
      [args.owner, args.spender]
    );

    return new kcs4.approve_result();
  }

  _check_authority(account: Uint8Array, amount: u64): bool {
    const caller = System.getCaller().caller;
    if (caller && caller.length > 0) {
      let key = new Uint8Array(50);
      key.set(account, 0);
      key.set(caller, 25);
      const allowance = this.allowances.get(key)!;
      if (allowance.value >= amount) {
        allowance.value -= amount;
        this.allowances.put(key, allowance);
        return true;
      }
    }

    return System.checkAccountAuthority(account);
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
