import { authority, chain, protocol, system_call_id, System, Protobuf, Base58, value, google } from "koinos-as-sdk";
import { governance } from "./proto/governance";

namespace State {
  export namespace Space {
    export const PROPOSAL = new chain.object_space(true, System.getContractId(), 0);
  }
}

namespace Constants {
  export const BLOCKS_PER_WEEK: u64 = 604800/10;
  export const REVIEW_PERIOD: u64 = BLOCKS_PER_WEEK;
  export const VOTE_PERIOD: u64 = BLOCKS_PER_WEEK*2;
  export const APPLICATION_DELAY: u64 = BLOCKS_PER_WEEK;
  export const GOVERNANCE_THRESHOLD: u64 = 75;
  export const STANDARD_THRESHOLD: u64 = 60;
  export const MIN_PROPOSAL_DENOMINATOR: u64 = 1000000;
  export const MAX_PROPOSAL_MULTIPLIER: u64 = 10;
}

export class Governance {

  retrieve_proposals(limit: u64, start: Uint8Array | null): Array<governance.proposal_record> {
    const proposalsLimit = limit != 0 ? limit : u64.MAX_VALUE;
    const proposalsStart = start != null ? start : new Uint8Array(0);

    let proposals = new Array<governance.proposal_record>();

    let obj = System.getNextObject<Uint8Array, governance.proposal_record>(State.Space.PROPOSAL, proposalsStart, governance.proposal_record.decode);

    let numProposals = 0 as u64;
    while (obj != null) {

      proposals.push(obj.value);
      numProposals++;

      if (numProposals >= proposalsLimit)
        break;

      obj = System.getNextObject<Uint8Array, governance.proposal_record>(State.Space.PROPOSAL, obj.key!, governance.proposal_record.decode);
    }

    return proposals;
  }

  retrieve_proposals_by_status(status: governance.proposal_status, limit: u64, start: Uint8Array | null): Array<governance.proposal_record> {
    const proposalsLimit = limit != 0 ? limit : u64.MAX_VALUE;
    const proposalsStart = start != null ? start : new Uint8Array(0);

    let proposals = new Array<governance.proposal_record>();

    let obj = System.getNextObject<Uint8Array, governance.proposal_record>(State.Space.PROPOSAL, proposalsStart, governance.proposal_record.decode);

    let numProposals: u64 = 0;
    while (obj != null) {

      if (obj.value.status == status) {
        proposals.push(obj.value);
        numProposals++;

        if (numProposals >= proposalsLimit)
          break;
      }

      obj = System.getNextObject<Uint8Array, governance.proposal_record>(State.Space.PROPOSAL, obj.key!, governance.proposal_record.decode);
    }

    return proposals;
  }

  proposal_updates_governance(proposal: protocol.transaction): bool {
    for (let index = 0; index < proposal.operations.length; index++) {
      const op = proposal.operations[index];

      if (op.upload_contract) {
        const upload_operation = (op.upload_contract as protocol.upload_contract_operation);
        if (upload_operation.contract_id == System.getContractId())
          return true;
      }
      else if (op.set_system_call) {
        const set_system_call_operation = (op.set_system_call as protocol.set_system_call_operation);

        const syscalls = new Array<system_call_id>();
        syscalls.push(system_call_id.pre_block_callback);
        syscalls.push(system_call_id.require_system_authority);
        syscalls.push(system_call_id.apply_set_system_call_operation);
        syscalls.push(system_call_id.apply_set_system_contract_operation);

        for (let i = 0; i < syscalls.length; i++) {
          if (set_system_call_operation.call_id == syscalls[i])
            return true;
        }
      }
      else if (op.set_system_contract) {
        const set_system_contract_operation = (op.set_system_contract as protocol.set_system_contract_operation);
        if (set_system_contract_operation.contract_id == System.getContractId())
          return true;
      }
    }
    return true;
  }

  submit_proposal(
    args: governance.submit_proposal_arguments
  ): governance.submit_proposal_result {
    const res = new governance.submit_proposal_result();
    res.value = false

    System.log('Checking payer');
    const payer_field = System.getTransactionField('header.payer');
    if (payer_field == null) {
      System.log('The payer field cannot be null');
      return res;
    }
    const payer = payer_field.bytes_value as Uint8Array;

    System.log('Checking header height');
    const block_height_field = System.getBlockField('header.height');
    if (block_height_field == null) {
      System.log('The block height cannot be null');
      return res;
    }
    const block_height =  block_height_field.uint64_value as u64;

    System.log('Checking proposal');
    if (args.proposal == null || args.proposal!.header == null) {
      System.log('The proposal and proposal header cannot be null');
      return res;
    }

    System.log('Checking prior proposal existence');
    if (System.getBytes(State.Space.PROPOSAL, args.proposal!.id!))
    {
      System.log('Proposal exists and cannot be updated');
      return res;
    }

    System.log('Creating proposal record');
    let prec = new governance.proposal_record();
    prec.proposal = args.proposal!;
    prec.vote_start_height = block_height + Constants.BLOCKS_PER_WEEK;
    prec.vote_tally = 0;
    prec.shall_authorize = false;
    prec.status = governance.proposal_status.pending;

    if (this.proposal_updates_governance(args.proposal!)) {
      prec.updates_governance = true;
      prec.vote_threshold = Constants.VOTE_PERIOD * Constants.GOVERNANCE_THRESHOLD / 100;
    }
    else {
      prec.updates_governance = false;
      prec.vote_threshold = Constants.VOTE_PERIOD * Constants.STANDARD_THRESHOLD / 100;
    }

    System.log('Storing proposal');
    let bytes = System.putObject(State.Space.PROPOSAL, args.proposal!.id!, prec, governance.proposal_record.encode);
    System.log('Stored proposal ' + Base58.encode(args.proposal!.id!) + ' using ' + bytes.toString() + ' bytes')

    let event = new governance.proposal_status_event();
    event.id = args.proposal!.id!;
    event.status = governance.proposal_status.pending;

    System.event('proposal.submission', Protobuf.encode(event, governance.proposal_status_event.encode), []);

    return res;
  }

  get_proposal_by_id(
    args: governance.get_proposal_by_id_arguments
  ): governance.get_proposal_by_id_result {
    let res = new governance.get_proposal_by_id_result();

    let obj = System.getObject<Uint8Array, governance.proposal_record>(State.Space.PROPOSAL, args.proposal_id!, governance.proposal_record.decode);

    res.value = obj;

    return res;
  }

  get_proposals_by_status(
    args: governance.get_proposals_by_status_arguments
  ): governance.get_proposals_by_status_result {
    const res = new governance.get_proposals_by_status_result();

    res.value = this.retrieve_proposals_by_status(args.status, args.limit, args.start_proposal);
    return res;
  }

  get_proposals(
    args: governance.get_proposals_arguments
  ): governance.get_proposals_result {
    const res = new governance.get_proposals_result();
    res.value = this.retrieve_proposals(args.limit, args.start_proposal);
    return res;
  }

  handle_pending_proposal(prec: governance.proposal_record, height: u64): void {
    System.log('Vote start height: ' + prec.vote_start_height.toString());
    System.log('Height: ' + height.toString());
    if (prec.vote_start_height != height) {
      return;
    }

    System.log('Handling pending proposal');

    let id = prec.proposal!.id!;

    prec.status = governance.proposal_status.active;
    System.putObject(State.Space.PROPOSAL, id, prec, governance.proposal_record.encode);

    let event = new governance.proposal_status_event();
    event.id = id;
    event.status = prec.status;

    System.event('proposal.status', Protobuf.encode(event, governance.proposal_status_event.encode), []);
  }

  handle_active_proposal(prec: governance.proposal_record, height: u64): void {
    if (prec.vote_start_height + Constants.VOTE_PERIOD != height) {
      return;
    }

    System.log('Handling active proposal');

    let id = prec.proposal!.id!;

    if (prec.vote_tally < prec.vote_threshold) {
      prec.status = governance.proposal_status.expired;

      let event = new governance.proposal_status_event();
      event.id = id;
      event.status = prec.status;

      System.event('proposal.status', Protobuf.encode(event, governance.proposal_status_event.encode), []);

      System.removeObject(State.Space.PROPOSAL, id);
    }
    else {
      prec.status = governance.proposal_status.approved;

      let event = new governance.proposal_status_event();
      event.id = id;
      event.status = prec.status;

      System.event('proposal.status', Protobuf.encode(event, governance.proposal_status_event.encode), []);
    }
  }

  handle_approved_proposal(prec: governance.proposal_record, height: u64): void {
    if (prec.vote_start_height + Constants.VOTE_PERIOD + Constants.APPLICATION_DELAY != height) {
      return;
    }

    System.log('Handling approved proposal');

    let id = prec.proposal!.id!;

    prec.shall_authorize = true;
    System.putObject(State.Space.PROPOSAL, id, prec, governance.proposal_record.encode);

    System.applyTransaction(prec.proposal!);
    prec.status = governance.proposal_status.applied;

    System.removeObject(State.Space.PROPOSAL, id);

    let event = new governance.proposal_status_event();
    event.id = id;
    event.status = prec.status;

    System.event('proposal.status', Protobuf.encode(event, governance.proposal_status_event.encode), []);
  }

  handle_votes(): void {
    const proposal_votes_bytes = System.getBlockField('header.approved_proposals');
    if (proposal_votes_bytes == null || proposal_votes_bytes.message_value == null) {
      System.log('No approved proposal message on block');
      return;
    }

    const votes = Protobuf.decode<value.list_type>(proposal_votes_bytes.message_value!.value!, value.list_type.decode);

    let proposal_set = new Set<Uint8Array>()
    for (let index = 0; index < votes.values.length; index++) {
        const proposal = votes.values[index].bytes_value!;
        proposal_set.add(proposal);
    }

    let proposals = proposal_set.values();

    for (let index = 0; index < proposals.length; index++) {
      let id = proposals[index];

      let prec = System.getObject<Uint8Array, governance.proposal_record>(State.Space.PROPOSAL, id, governance.proposal_record.decode);

      if (!prec)
        continue;

      if (prec.status != governance.proposal_status.active)
        continue;

      let current_vote_tally = prec.vote_tally as u64;

      if (current_vote_tally != u64.MAX_VALUE)
        prec.vote_tally = current_vote_tally + 1;

      System.putObject(State.Space.PROPOSAL, id, prec, governance.proposal_record.encode);

      let event = new governance.proposal_vote_event();
      event.id = id;
      event.vote_tally = current_vote_tally;
      event.vote_threshold = prec.vote_threshold;

      System.event('proposal.vote', Protobuf.encode(event, governance.proposal_vote_event.encode), []);
    }
  }

  block_callback(
    args: governance.block_callback_arguments
  ): governance.block_callback_result {
    if (System.getCaller().caller_privilege != chain.privilege.kernel_mode) {
      System.log('Governance contract block callback must be called from kernel');
      System.exitContract(1);
    }

    //this.handle_votes();
    System.log('Executing governance block callback');

    const block_height_field = System.getBlockField('header.height');
    if (block_height_field == null) {
      System.log('The block height cannot be null');
      System.exitContract(1);
      return new governance.block_callback_result();
    }
    const height =  block_height_field.uint64_value as u64;

    let proposals = this.retrieve_proposals(0, new Uint8Array(0));
    for (let i = 0; i < proposals.length; i++) {
      let proposal = proposals[i];
      switch (proposal.status) {
        case governance.proposal_status.pending:
          this.handle_pending_proposal(proposal, height);
          break;
        case governance.proposal_status.active:
          this.handle_active_proposal(proposal, height);
          break;
        case governance.proposal_status.approved:
          this.handle_approved_proposal(proposal, height);
          break;
        default:
          System.log('Attempted to handle unexpected proposal status');
          break;
      }
    }

    return new governance.block_callback_result();
  }

  authorize(args: authority.authorize_arguments): authority.authorize_result {
    let authorized: bool = false;

    if (args.type == authority.authorization_type.transaction_application) {
      let id: Uint8Array = System.getTransactionField('header.id')!.bytes_value!;

      let prec = System.getObject<Uint8Array, governance.proposal_record>(State.Space.PROPOSAL, id, governance.proposal_record.decode);

      if (prec != null)
        if (prec.shall_authorize)
          authorized = true;
    }

    return new authority.authorize_result(authorized);
  }
}
