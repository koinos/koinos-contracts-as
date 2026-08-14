import {u128} from 'as-bignum/assembly';
import { chain, System, Protobuf, authority, system_calls, Token, Crypto, pob, vhp, StringBytes } from "@koinos/sdk-as";
import { fund } from "./proto/fund";

namespace Constants {
  /**
   *  Because tokens are added to the supply each block, we need a slightly lower rate to
   *  account for the compounding interest. We can use the equation:
   *
   *  ( 1 + x / blocks_per_year ) ^ blocks_per_year = 1 + desired_inflation_rate
   *
   *  Solving for x and simplifying yields:
   *
   *  x = blocks_per_year * ( ( 1 + desired_inflation_rate ) ^ ( 1 / blocks_per_year ) - 1 )
   */
  export const DEFAULT_ANNUAL_INFLATION_RATE: u32 = 39221; // 4%
  export const DEFAULT_TARGET_BURN_PERCENT: u32 = 501000; // 50.1%
  export const DEFAULT_TARGET_BLOCK_INTERVAL_MS: u32 = 3000; // 3s
  export const DEFAULT_QUANTUM_LENGTH_MS: u32 = 10;
  export const METADATA_KEY: Uint8Array = new Uint8Array(0);
  export const CONSENSUS_PARAMS_KEY: Uint8Array = new Uint8Array(1);
  export const INITIAL_DIFFICULTY_BITS:u8 = BUILD_FOR_TESTING ? 44 : 58;
  export const ONE_HUNDRED_PERCENT: u32 = 1000000;
  export const MILLISECONDS_PER_YEAR = 31536000000;
  export const DELAY_BLOCKS: u64 = 20;

  let contractId: Uint8Array | null = null;
  let koinContractId: Uint8Array | null = null;
  let vhpContractId: Uint8Array | null = null;
  let koinosFundContractId: Uint8Array | null = null;

  export function ContractId() : Uint8Array {
    if (contractId === null) {
      contractId = System.getContractId();
    }

    return contractId!;
  }

  export function KoinContractId() : Uint8Array {
    if (koinContractId === null) {
      koinContractId = System.getContractAddress('koin');
    }

    return koinContractId!;
  }

  export function VhpContractId(): Uint8Array {
    if (vhpContractId === null ) {
      vhpContractId = System.getContractAddress('vhp');
    }

    return vhpContractId!;
  }

  export function KoinosFundContractId(): Uint8Array {
    if (koinosFundContractId === null ) {
      koinosFundContractId = System.getContractAddress('koinos-fund');
    }

    return koinosFundContractId!;
  }
}

namespace State {
  export namespace Space {
    let registration : chain.object_space | null = null;
    let metadata : chain.object_space | null = null;

    export function Registration() : chain.object_space {
      if (registration === null) {
        registration = new chain.object_space(true, Constants.ContractId(), 0);
      }

      return registration!;
    }

    export function Metadata() : chain.object_space {
      if (metadata === null) {
        metadata = new chain.object_space(true, Constants.ContractId(), 1);
      }

      return metadata!;
    }
  }
}

class VHP extends Token {
  constructor(contractId: Uint8Array) {
    super(contractId);
  }

  effectiveBalanceOf(owner: Uint8Array): u64 {
    const args = new vhp.effective_balance_of_arguments(owner);

    const callRes = System.call(this._contractId, 0x629f31e6, Protobuf.encode(args, vhp.effective_balance_of_arguments.encode));
    System.require(callRes.code == 0, "failed to retrieve token balance");
    if (!callRes.res.object) return 0;
    const res = Protobuf.decode<vhp.effective_balance_of_result>(callRes.res.object as Uint8Array, vhp.effective_balance_of_result.decode);

    return res.value;
  }
}

class KoinosFund {
  pay_projects(): fund.pay_projects_result {
    const callRes = System.call(
      Constants.KoinosFundContractId(),
      0xffee4af6,
      new Uint8Array(0)
    );
    if (callRes.code != 0) {
      const errorMessage = `failed to call pay_projects: ${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message : "unknown error"}`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new fund.pay_projects_result();
    return Protobuf.decode<fund.pay_projects_result>(callRes.res.object, fund.pay_projects_result.decode);
  }

  get_global_vars(): fund.global_vars {
    const callRes = System.call(
      Constants.KoinosFundContractId(),
      0x2e4369d4,
      new Uint8Array(0)
    );
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Fund.get_global_vars': ${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message : "unknown error"}`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new fund.global_vars();
    return Protobuf.decode<fund.global_vars>(callRes.res.object, fund.global_vars.decode);
  }
}

export class Pob {
  register_public_key(args: pob.register_public_key_arguments): pob.register_public_key_result {
    System.require(args.producer != null, 'producer cannot be null');

    System.requireAuthority(authority.authorization_type.contract_call, args.producer);

    // Create and store the record
    if(args.public_key == null ) {
      System.removeObject(State.Space.Registration(), args.producer);
    } else {
      const record = new pob.public_key_record(args.public_key, System.getBlockField('header.height')!.uint64_value);
      System.putObject(State.Space.Registration(), args.producer, record, pob.public_key_record.encode);
    }

    // Emit an event
    const event = new pob.register_public_key_event(args.producer, args.public_key);
    System.event('koinos.contracts.pob.register_public_key_event', Protobuf.encode(event, pob.register_public_key_event.encode), [args.producer]);

    return new pob.register_public_key_result();
  }

  burn(args: pob.burn_arguments): pob.burn_result {
    const koinToken = new Token(Constants.KoinContractId());
    const vhpToken = new VHP(Constants.VhpContractId());
    const amount = args.token_amount;

    // Burn the token
    System.require(koinToken.burn(args.burn_address, amount), "could not burn KOIN");

    // Mint the new VHP
    System.require(vhpToken.mint(args.vhp_address, amount), "could not mint VHP");

    return new pob.burn_result();
  }

  process_block_signature(args: system_calls.process_block_signature_arguments): system_calls.process_block_signature_result {
    System.require(System.getCaller().caller_privilege == chain.privilege.kernel_mode, 'pob contract process block signature must be called from kernel');

    const signature = Protobuf.decode<pob.signature_data>(args.signature, pob.signature_data.decode);

    const koinToken = new Token(Constants.KoinContractId());
    const vhpToken = new VHP(Constants.VhpContractId());

    const metadata = this.fetch_metadata();
    const params = this.fetch_consensus_parameters();

    // Check block quanta
    System.require(args.header!.timestamp % params.quantum_length == 0, "time stamp does not match time quanta");

    // Get signer's public key
    const registration = System.getObject<Uint8Array, pob.public_key_record>(State.Space.Registration(), args.header!.signer, pob.public_key_record.decode);
    System.require(registration != null, "signer address has no public key record");

    let blockHeight = System.getBlockField('header.height')!.uint64_value;
    if (blockHeight < Constants.DELAY_BLOCKS) {
      blockHeight = Constants.DELAY_BLOCKS;
    }

    System.require(registration!.set_block_height <= blockHeight - Constants.DELAY_BLOCKS, "public key not yet active");

    // Create vrf payload and serialize it
    const payload = new pob.vrf_payload(metadata.seed, args.header!.timestamp);
    const payload_bytes = Protobuf.encode(payload, pob.vrf_payload.encode);

    System.require(System.verifyVRFProof(registration!.public_key, signature.vrf_proof, signature.vrf_hash, payload_bytes), "proof failed vrf validation");

    // Ensure vrf hash divided by producer's vhp is below difficulty
    const difficulty = u128.fromBytes(metadata.difficulty, true);
    const target = u128.Max / difficulty;
    let mh = new Crypto.Multihash();
    mh.deserialize(signature.vrf_hash);
    // This purposefully only gets the upper 128 bits. That's all we need
    let hash = u128.fromBytes(mh.digest, true);
    const vhp_balance = u128.fromU64(vhpToken.effectiveBalanceOf(args.header!.signer));

    hash = hash / vhp_balance;

    System.require(hash < target, "provided hash is not sufficient");

    const virtual_supply = u128.fromU64(koinToken.totalSupply() + vhpToken.totalSupply());
    const yearly_inflation = virtual_supply * u128.fromU64(params.target_annual_inflation_rate) / u128.fromU64(Constants.ONE_HUNDRED_PERCENT);

    const blocks_per_year = Constants.MILLISECONDS_PER_YEAR / params.target_block_interval;

    const new_koins = yearly_inflation.toU64() / blocks_per_year;
    const block_reward = new_koins / 2;
    const block_fund = new_koins - block_reward;
    // virtual supply starts at 10000000000000000 and target_burn_percent is 501000. This already uses 73 bits
    const vhp_reduction = (virtual_supply * u128.fromU64(params.target_burn_percent)) / u128.fromU64(blocks_per_year * Constants.ONE_HUNDRED_PERCENT);

    // On successful block deduct vhp and mint new koin
    System.require(vhpToken.burn(args.header!.signer, vhp_reduction.toU64()), "could not burn vhp");
    System.require(koinToken.mint(args.header!.signer, block_reward + vhp_reduction.toU64()), "could not mint token");
    System.require(koinToken.mint(Constants.KoinosFundContractId(), block_fund), "could not mint token for fund");

    // pay projects in Koinos Fund
    if (args.header!.timestamp >= metadata.next_koinos_fund_payment_time) {
      const result = new KoinosFund().pay_projects();
      metadata.next_koinos_fund_payment_time = result.next_payment_time;
    }

    this.update_difficulty(difficulty, metadata, params, args.header!.timestamp, signature.vrf_hash);
    return new system_calls.process_block_signature_result(true);
  }

  get_metadata(args: pob.get_metadata_arguments): pob.get_metadata_result {
    const metadata = this.fetch_metadata();
    return new pob.get_metadata_result(metadata);
  }

  update_difficulty(difficulty:u128, metadata:pob.metadata, params:pob.consensus_parameters, current_block_time:u64, vrf_hash:Uint8Array): void {
    // This is a generalization of Ethereum's Homestead difficulty adjustment algorithm
    const block_time_denom = (10000 * params.target_block_interval) / 14000;

    // Calulate new difficulty
    let new_difficulty: u128 = difficulty / u128.fromU64(2048);
    let multiplier:i64 = 1 - i64(current_block_time - metadata.last_block_time) / block_time_denom;
    multiplier = multiplier > -99 ? multiplier : -99;
    if (multiplier >= 0) {
      new_difficulty = difficulty + new_difficulty * u128.fromU64(u64(multiplier));
    } else {
      new_difficulty = difficulty - new_difficulty * u128.fromU64(u64(-multiplier));
    }

    let new_data = new pob.metadata(
      System.hash(Crypto.multicodec.sha2_256, vrf_hash)!,
      new_difficulty.toUint8Array(true),
      current_block_time,
      metadata.next_koinos_fund_payment_time
    );

    System.putObject(State.Space.Metadata(), Constants.METADATA_KEY, new_data, pob.metadata.encode);
  }

  fetch_metadata(): pob.metadata {
    const data = System.getObject<Uint8Array, pob.metadata>(State.Space.Metadata(), Constants.METADATA_KEY, pob.metadata.decode);

    if (data) {
      if (data.next_koinos_fund_payment_time == 0) {
        // initialize next_koinos_fund_payment_time from koinos fund contract
        const koinosFund = new KoinosFund();
        const globalVars = koinosFund.get_global_vars();
        data.next_koinos_fund_payment_time = globalVars.payment_times[0];
      }
      return data;
    }

    // Initialize new metadata
    let new_data = new pob.metadata();

    new_data.difficulty = (u128.One << (Constants.INITIAL_DIFFICULTY_BITS - 1)).toUint8Array(true);
    new_data.seed = System.getChainId();
    new_data.last_block_time = System.getHeadInfo().head_block_time;

    return new_data;
  }

  get_consensus_parameters(args: pob.get_consensus_parameters_arguments): pob.get_consensus_parameters_result {
    return new pob.get_consensus_parameters_result(this.fetch_consensus_parameters());
  }

  fetch_consensus_parameters(): pob.consensus_parameters {
    const data = System.getObject<Uint8Array, pob.consensus_parameters>(State.Space.Metadata(), Constants.CONSENSUS_PARAMS_KEY, pob.consensus_parameters.decode);

    if (data) {
      return data;
    }

    // Initialize new consensus_parameters
    let new_data = new pob.consensus_parameters();

    new_data.target_annual_inflation_rate = Constants.DEFAULT_ANNUAL_INFLATION_RATE;
    new_data.target_burn_percent = Constants.DEFAULT_TARGET_BURN_PERCENT;
    new_data.target_block_interval = Constants.DEFAULT_TARGET_BLOCK_INTERVAL_MS;
    new_data.quantum_length = Constants.DEFAULT_QUANTUM_LENGTH_MS;

    return new_data;
  }

  get_public_key(args: pob.get_public_key_arguments): pob.get_public_key_result {
    const registration = System.getObject<Uint8Array, pob.public_key_record>(State.Space.Registration(), args.producer, pob.public_key_record.decode);
    System.require(registration != null, "given address has no public key record");

    return new pob.get_public_key_result(registration!.public_key);
  }

  update_consensus_parameters(args: pob.update_consensus_parameters_arguments): pob.update_consensus_parameters_result {
    System.require(System.checkSystemAuthority(), "caller must have system authority to update consensus parameters");

    System.putObject(State.Space.Metadata(), Constants.CONSENSUS_PARAMS_KEY, args.value!, pob.consensus_parameters.encode);

    return new pob.update_consensus_parameters_result();
  }
}
