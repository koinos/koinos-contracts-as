// SPDX-License-Identifier: MIT
// Koinos Group, Inc. (contact@koinos.group)

import { kcs4, System, Token } from "@koinos/sdk-as";

export class Koin {
  _koinToken: Token = new Token(System.getContractAddress('koin'));

  name(): kcs4.name_result {
    return new kcs4.name_result(this._koinToken.name());
  }

  symbol(): kcs4.symbol_result {
    return new kcs4.symbol_result(this._koinToken.symbol());
  }

  decimals(): kcs4.decimals_result {
    return new kcs4.decimals_result(this._koinToken.decimals());
  }

  get_info(): kcs4.get_info_result {
    return new kcs4.get_info_result(this._koinToken.name(), this._koinToken.symbol(), this._koinToken.decimals());
  }

  total_supply(): kcs4.total_supply_result {
    return new kcs4.total_supply_result(this._koinToken.totalSupply());
  }

  balance_of(args: kcs4.balance_of_arguments): kcs4.balance_of_result {
    return new kcs4.balance_of_result(this._koinToken.balanceOf(args.owner));
  }

  allowance(args: kcs4.allowance_arguments): kcs4.allowance_result {
    return new kcs4.allowance_result(this._koinToken.allowance(args.owner, args.spender));
  }

  get_allowances(args: kcs4.get_allowances_arguments): kcs4.get_allowances_result {
    return new kcs4.get_allowances_result(args.owner, this._koinToken.getAllowances(args.owner, args.start, args.limit, args.descending));
  }

  transfer(args: kcs4.transfer_arguments): kcs4.transfer_result {
    System.require(this._koinToken.transfer(args.from, args.to, args.value));

    return new kcs4.transfer_result();
  }

  mint(args: kcs4.mint_arguments): kcs4.mint_result {
    System.require(this._koinToken.mint(args.to, args.value));

    return new kcs4.mint_result();
  }

  burn(args: kcs4.burn_arguments): kcs4.burn_result {
    System.require(this._koinToken.burn(args.from, args.value));

    return new kcs4.burn_result();
  }

  approve(args: kcs4.approve_arguments): kcs4.approve_result {
    System.require(this._koinToken.approve(args.owner, args.spender, args.value));

    return new kcs4.approve_result();
  }
}
