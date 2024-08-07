// SPDX-License-Identifier: MIT
// Token Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)
// Koinos Group, Inc. (contact@koinos.group)

import { Arrays, authority, chain, error, kcs4, Protobuf, Storage, System, system_calls, u128 } from "@koinos/sdk-as";
import { koin } from "./proto/koin";

const SUPPLY_SPACE_ID = 0;
const BALANCES_SPACE_ID = 1;
const ALLOWANCES_SPACE_ID = 2;

namespace Detail {
  let zone: Uint8Array = new Uint8Array(0);

  export function Zone(): Uint8Array {
    if (zone.length == 0) {

      zone = new Uint8Array(25);
      if (BUILD_FOR_TESTING) {
        // 1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju
        zone.set([0x00, 0x9f, 0xe5, 0x1f, 0xd5, 0x9c, 0x8c, 0x93, 0x10, 0x98, 0x10, 0x83, 0x09, 0x7d, 0x02, 0x5e, 0x1d, 0x4d, 0x75, 0x38, 0x0f, 0x2e, 0x9f, 0x99, 0xfc]);
      } else {
        // 15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL
        zone.set([0x00, 0x2e, 0x33, 0xfd, 0x1a, 0xa9, 0x07, 0xb2, 0x24, 0xce, 0x9c, 0xe6, 0xc9, 0x42, 0x28, 0x90, 0x1d, 0x28, 0x3a, 0x02, 0xda, 0x95, 0x6d, 0xa7, 0x91]);
      }

    }

    return zone;
  }
}

function min<T>(a: T, b: T): T {
  return a < b ? a : b;
}

export class Koin {
  _name: string = BUILD_FOR_TESTING ? "Test Koin" : "Koin";
  _symbol: string = BUILD_FOR_TESTING ? "tKOIN" : "KOIN";
  _decimals: u32 = 8;
  _mana_regen_time_ms: u64 = 432000000; // 5 days

  supply: Storage.Obj< koin.balance_object > = new Storage.Obj(
    Detail.Zone(),
    SUPPLY_SPACE_ID,
    koin.balance_object.decode,
    koin.balance_object.encode,
    () => new koin.balance_object(),
    true
  );

  balances: Storage.Map< Uint8Array, koin.mana_balance_object > = new Storage.Map(
    Detail.Zone(),
    BALANCES_SPACE_ID,
    koin.mana_balance_object.decode,
    koin.mana_balance_object.encode,
    () => new koin.mana_balance_object(),
    true
  );

  allowances: Storage.Map< Uint8Array, koin.balance_object > = new Storage.Map(
    Detail.Zone(),
    ALLOWANCES_SPACE_ID,
    koin.balance_object.decode,
    koin.balance_object.encode,
    () => new koin.balance_object(),
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
    return new kcs4.balance_of_result(this.balances.get(args.owner)!.balance);
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

  get_account_rc(args: system_calls.get_account_rc_arguments): system_calls.get_account_rc_result {
    const governanceAddress = System.getContractAddress("governance");

    if (Arrays.equal(args.account, governanceAddress)) {
      return new system_calls.get_account_rc_result(u64.MAX_VALUE);
    }

    const balanceObj = this.balances.get(args.account)!;
    this._regenerate_mana(balanceObj);
    return new system_calls.get_account_rc_result(balanceObj.mana);
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
    System.require(fromBalance.balance >= args.value, "account 'from' has insufficient balance", error.error_code.failure);

    this._regenerate_mana(fromBalance);
    System.require(fromBalance.mana >= args.value, "account 'from' has insufficient mana for transfer", error.error_code.failure);

    let toBalance = this.balances.get(args.to)!;
    this._regenerate_mana(toBalance);

    fromBalance.balance -= args.value;
    fromBalance.mana -= args.value;
    toBalance.balance += args.value;
    toBalance.mana += args.value;

    this.balances.put(args.from, fromBalance);
    this.balances.put(args.to, toBalance);

    System.event(
      'token.transfer_event',
      Protobuf.encode(new kcs4.transfer_event(args.from, args.to, args.value, args.memo), kcs4.transfer_event.encode),
      [args.to, args.from]
    );

    return new kcs4.transfer_result();
  }

  mint(args: kcs4.mint_arguments): kcs4.mint_result {
    System.require(args.to != null, "account 'to' cannot be null");
    System.require(args.value != 0, "account 'value' cannot be zero");

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
    this._regenerate_mana(balance);

    supply.value += args.value;
    balance.balance += args.value;
    balance.mana += args.value;

    this.supply.put(supply);
    this.balances.put(args.to, balance);

    System.event(
      'token.mint_event',
      Protobuf.encode(new kcs4.mint_event(args.to, args.value), kcs4.mint_event.encode),
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
    System.require(fromBalance.balance >= args.value, "account 'from' has insufficient balance", error.error_code.failure);

    this._regenerate_mana(fromBalance);
    System.require(fromBalance.mana >= args.value, "account 'from' has insufficient mana for burn", error.error_code.failure);

    let supply = this.supply.get()!;
    System.require(supply.value >= args.value, 'burn would underflow supply', error.error_code.failure);

    supply.value -= args.value;
    fromBalance.balance -= args.value;
    fromBalance.mana -= args.value;

    this.supply.put(supply);
    this.balances.put(args.from, fromBalance);

    System.event(
      'token.burn_event',
      Protobuf.encode(new kcs4.burn_event(args.from, args.value), kcs4.burn_event.encode),
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
    this.allowances.put(key, new koin.balance_object(args.value));

    System.event(
      "token.approve_event",
      Protobuf.encode(new kcs4.approve_event(args.owner, args.spender, args.value), kcs4.approve_event.encode),
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

  consume_account_rc(args: system_calls.consume_account_rc_arguments): system_calls.consume_account_rc_result {
    const callerData = System.getCaller();

    if (callerData.caller_privilege != chain.privilege.kernel_mode) {
      System.log( "The system call 'consume_account_rc' must be called from kernel context" );
      return new system_calls.consume_account_rc_result(false);
    }

    const balanceObj = this.balances.get(args.account)!;
    this._regenerate_mana(balanceObj);

    // Mana cannot go negative
    if (balanceObj.mana < args.value) {
      // TODO: Improve log message?
      System.log( "Account has insufficient mana for consumption" );
      return new system_calls.consume_account_rc_result(false);
    }

    balanceObj.mana -= args.value;
    this.balances.put(args.account, balanceObj);

    return new system_calls.consume_account_rc_result(true);
  }

  _regenerate_mana(balanceObj: koin.mana_balance_object): void {
    /* THIS FUNCTION IS CRITICAL!!!
     *
     * Below is the original c++ implementation for reference:
     *
     * auto head_block_time = system::get_head_info().head_block_time();
     * auto delta = std::min( head_block_time - bal.last_mana_update(), constants::mana_regen_time_ms );
     * if ( delta )
     * {
     *   auto new_mana = bal.mana() + ( ( int128_t( delta ) * int128_t( bal.balance() ) ) / constants::mana_regen_time_ms ).convert_to< uint64_t >() ;
     *   bal.set_mana( std::min( new_mana, bal.balance() ) );
     *   bal.set_last_mana_update( head_block_time );
     *  }
     */

    const head_block_time = System.getHeadInfo().head_block_time;
    const delta = min(head_block_time - balanceObj.last_mana_update, this._mana_regen_time_ms);

    if (delta > 0) {
      const new_mana = balanceObj.mana + ( ( u128.from( delta ) * u128.from( balanceObj.balance ) ) / u128.from( this._mana_regen_time_ms ) ).as<u64>();
      balanceObj.mana = min( new_mana, balanceObj.balance );
      balanceObj.last_mana_update = head_block_time;
    }
  }
}
