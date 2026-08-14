// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import { Arrays, StringBytes, chain, kcs4, Protobuf, Storage, System } from "@koinos/sdk-as";
import { fund } from "./proto/fund";

const GLOBAL_VARS_SPACE_ID = 0;
const PROJECTS_SPACE_ID = 1;
const ACTIVE_PROJECTS_BY_VOTES_SPACE_ID = 2;
const ACTIVE_PROJECTS_BY_DATE_SPACE_ID = 3;
const UPCOMING_PROJECTS_BY_VOTES_SPACE_ID = 4;
const UPCOMING_PROJECTS_BY_DATE_SPACE_ID = 5;
const PAST_PROJECTS_BY_DATE_SPACE_ID = 6;
const PROJECTS_BY_VOTER_SPACE_ID = 7;
const WEIGHTS_BY_VOTER_SPACE_ID = 8;

/**
 * idByVotes helps to order projects by number of votes.
 * The ID of the records has two parts: number of votes and project ID.
 * - number of votes: First 17 digits. Allow up to 1 billion -1 votes.
 * - project ID: 6 digits. Allow up to 1 million -1 projects.
 */
function idByVotes(votes: u64, projectId: u32): string {
  return `${votes}`.padStart(17, "0") + `${u32(1e6) - projectId}`.padStart(6, "0");
}

function idByDate(date: u64, projectId: u32): string {
  return `${date}` + `${projectId}`.padStart(6, "0");
}

class Token {
  contractId: Uint8Array;

  constructor(contractId: Uint8Array) {
    this.contractId = contractId;
  }

  balance_of(account: Uint8Array): u64 {
    const callRes = System.call(
      this.contractId,
      0x5c721497,
      Protobuf.encode(
        new kcs4.balance_of_arguments(account),
        kcs4.balance_of_arguments.encode
      )
    );
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.balance_of': ${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message : "unknown error"}`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return 0;
    return Protobuf.decode<kcs4.balance_of_result>(callRes.res.object, kcs4.balance_of_result.decode).value;
  }

  set_votes_koinos_fund(account: Uint8Array, votes_koinos_fund: bool): void {
    System.call(
      this.contractId,
      0x2178d8fa,
      Protobuf.encode(
        new fund.set_votes_koinos_fund_arguments(
          account,
          votes_koinos_fund
        ),
        fund.set_votes_koinos_fund_arguments.encode
      )
    );
  }

  transfer(from: Uint8Array, to: Uint8Array, value: u64): void {
    const callRes = System.call(
      this.contractId,
      0x27f576ca,
      Protobuf.encode(
        new kcs4.transfer_arguments(from, to, value),
        kcs4.transfer_arguments.encode
      )
    );
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.transfer': ${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message : "unknown error"}`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
  }
}

export class Fund {
  contractId: Uint8Array = System.getContractId();

  globalVars: Storage.Obj< fund.global_vars > = new Storage.Obj(
    this.contractId,
    GLOBAL_VARS_SPACE_ID,
    fund.global_vars.decode,
    fund.global_vars.encode,
    null,
    true
  );

  projects: Storage.Map< string, fund.project > = new Storage.Map(
    this.contractId,
    PROJECTS_SPACE_ID,
    fund.project.decode,
    fund.project.encode,
    null,
    true
  );

  activeProjectsByVotes: Storage.Map< string, fund.existence > = new Storage.Map(
    this.contractId,
    ACTIVE_PROJECTS_BY_VOTES_SPACE_ID,
    fund.existence.decode,
    fund.existence.encode,
    null,
    true
  );

  activeProjectsByDate: Storage.Map< string, fund.existence > = new Storage.Map(
    this.contractId,
    ACTIVE_PROJECTS_BY_DATE_SPACE_ID,
    fund.existence.decode,
    fund.existence.encode,
    null,
    true
  );

  upcomingProjectsByVotes: Storage.Map< string, fund.existence > = new Storage.Map(
    this.contractId,
    UPCOMING_PROJECTS_BY_VOTES_SPACE_ID,
    fund.existence.decode,
    fund.existence.encode,
    null,
    true
  );

  upcomingProjectsByDate: Storage.Map< string, fund.existence > = new Storage.Map(
    this.contractId,
    UPCOMING_PROJECTS_BY_DATE_SPACE_ID,
    fund.existence.decode,
    fund.existence.encode,
    null,
    true
  );

  pastProjectsByDate: Storage.Map< string, fund.existence > = new Storage.Map(
    this.contractId,
    PAST_PROJECTS_BY_DATE_SPACE_ID,
    fund.existence.decode,
    fund.existence.encode,
    null,
    true
  );

  projectsByVoter: Storage.Map< Uint8Array, fund.vote_info > = new Storage.Map(
    this.contractId,
    PROJECTS_BY_VOTER_SPACE_ID,
    fund.vote_info.decode,
    fund.vote_info.encode,
    null,
    true
  );

  weights: Storage.Map< Uint8Array, fund.vote_info > = new Storage.Map(
    this.contractId,
    WEIGHTS_BY_VOTER_SPACE_ID,
    fund.vote_info.decode,
    fund.vote_info.encode,
    () => new fund.vote_info(),
    true
  );

  set_global_vars(args: fund.set_global_vars_arguments): void {
    System.require(System.checkSystemAuthority(), "not authorized by the system");
    let globalVars = this.globalVars.get();
    if (!globalVars) globalVars = new fund.global_vars();
    globalVars.fee_denominator = args.fee_denominator;

    let newPaymentTime = System.getHeadInfo().head_block_time;
    globalVars.payment_times = [];

    for (let i = 0; i < 6; i += 1) {
      if (BUILD_FOR_TESTING) {
        // TESTNET
        // Payment per day
        newPaymentTime += 24 * 60 * 60 * 1000;
      } else {
        // MAINNET
        // Calculate last day of the month (at noon)
        const date = new Date(i64(newPaymentTime));
        let year = date.getUTCFullYear();
        let month = date.getUTCMonth();
        month += i > 0 ? 2 : 1; 
        if (month > 11) {
          month -= 12;
          year += 1;
        }
        newPaymentTime = Date.UTC(year, month, 1, 0, 0, 0, 0) - 12 * 60 * 60 * 1000;
      }
      globalVars.payment_times.push(newPaymentTime);
    }

    this.globalVars.put(globalVars);
  }

  get_global_vars(): fund.global_vars {
    const globalVars = this.globalVars.get();
    System.require(globalVars, "fund contract not configured");
    return globalVars!;
  }

  get_project(args: fund.get_project_arguments): fund.project {
    const project = this.projects.get(`${args.project_id}`);
    if (!project) System.fail("project not found");
    return project!;
  }

  get_projects(args: fund.get_projects_arguments): fund.get_projects_result {
    const result = new fund.get_projects_result();

    let projectsOrdered: Storage.Map< string, fund.existence >;
    if (args.order_by == fund.order_projects_by.by_date) {
      if (args.status == fund.project_status.upcoming) {
        projectsOrdered = this.upcomingProjectsByDate;
      } else if (args.status == fund.project_status.active) {
        projectsOrdered = this.activeProjectsByDate;
      } else {
        projectsOrdered = this.pastProjectsByDate;
      }
    } else {
      if (args.status == fund.project_status.upcoming) {
        projectsOrdered = this.upcomingProjectsByVotes;
      } else if (args.status == fund.project_status.active) {
        projectsOrdered = this.activeProjectsByVotes;
      } else {
        System.fail("past projects are not ordered by votes");
        return result;
      }
    }

    let key = args.start ? args.start : "";
    for (let i = 0; i < args.limit; i += 1) {
      const nextProjectId = args.descending
        ? projectsOrdered.getPrev(key!)
        : projectsOrdered.getNext(key!);
      if (!nextProjectId) break;
      const projectId: u32 = args.order_by == fund.order_projects_by.by_date
        ? u32.parse(StringBytes.bytesToString(nextProjectId.key!.slice(13)))
        : u32(1e6) - u32.parse(StringBytes.bytesToString(nextProjectId.key!.slice(17)));
      const project = this.projects.get(`${projectId}`);
      if (project) result.projects.push(project);
      key = StringBytes.bytesToString(nextProjectId.key!);
    }
    result.start_next_page = key;
    return result;
  }

  get_user_votes(args: fund.get_user_votes_arguments): fund.get_user_votes_result {
    let keyByVoter = new Uint8Array(31);
    keyByVoter.set(args.voter!);

    const result = new fund.get_user_votes_result([]);

    while (true) {
      const voteRecord = this.projectsByVoter.getNext(keyByVoter);
      if (!voteRecord) break;

      keyByVoter = voteRecord.key!;
      if (!Arrays.equal(keyByVoter.slice(0, 25), args.voter!)) break;

      result.votes.push(voteRecord.value);
    }

    return result;
  }

  submit_project(args: fund.submit_project_arguments): fund.submit_project_result {
    const now = System.getHeadInfo().head_block_time;
    System.require(args.start_date < args.end_date, "starting date must be before ending date");
    System.require(now < args.end_date, "ending date must be in the future");
    const globalVars = this.globalVars.get();
    System.require(globalVars, "fund contract not configured");
    const p: u64 = globalVars!.total_active_projects + globalVars!.total_upcoming_projects + 1;
    const t = args.end_date - args.start_date;
    const expectedFee = p * p * p * ( t / globalVars!.fee_denominator );
    System.require(args.fee >= expectedFee, `the fee must be at least ${expectedFee}`);
    System.require(args.beneficiary != null, "beneficiary must be defined");
    const koinToken = new Token(System.getContractAddress("koin"));
    koinToken.transfer(args.creator!, this.contractId, args.fee);

    globalVars!.total_projects += 1;
    const id = globalVars!.total_projects;

    const votes = new Array<u64>(6);
    const project = new fund.project(
      id,
      args.creator,
      args.beneficiary,
      args.title,
      args.description,
      args.monthly_payment,
      args.start_date,
      args.end_date,
      fund.project_status.upcoming,
      0,
      votes,
    );

    if (now < args.start_date) {
      this.upcomingProjectsByVotes.put(idByVotes(0, id), new fund.existence());
      this.upcomingProjectsByDate.put(idByDate(args.start_date, id), new fund.existence());
      globalVars!.total_upcoming_projects += 1;
    } else {
      this.activeProjectsByVotes.put(idByVotes(0, id), new fund.existence());
      this.activeProjectsByDate.put(idByDate(args.end_date, id), new fund.existence());
      globalVars!.total_active_projects += 1;
      project.status = fund.project_status.active;
    }
    this.projects.put(`${id}`, project);
    this.globalVars.put(globalVars!);

    System.event(
      "fund.submit_project_event",
      Protobuf.encode(
        args,
        fund.submit_project_arguments.encode
      ),
      [args.beneficiary!, args.creator!]
    );

    return new fund.submit_project_result();
  }

  update_vote(args: fund.update_vote_arguments): fund.update_vote_result {
    System.require(System.checkAccountAuthority(args.voter!), "not authorized by the voter")
    const globalVars = this.globalVars.get();
    System.require(globalVars, "fund contract not configured");
    const project = this.projects.get(`${args.project_id}`);
    System.require(project, "project not found");

    const koinContract = new Token(System.getContractAddress("koin"));
    const vhpContract = new Token(System.getContractAddress("vhp"));

    // get current vote to see weight and expiration
    const keyByVoter = new Uint8Array(31);
    keyByVoter.set(args.voter!);
    keyByVoter.set(StringBytes.stringToBytes(`${project!.id}`), 25);
    let vote = this.projectsByVoter.get(keyByVoter);

    // get weights used by the user
    const weight = this.weights.get(args.voter!)!;

    if (project!.status == fund.project_status.past) {
      System.require(!!vote, "cannot vote on past projects");
      System.require(args.weight == 0, "cannot update vote on past project, only remove vote");

      // remove vote from the list of user votes
      this.projectsByVoter.remove(keyByVoter);

      // remove vote from the weights used by the user
      weight.weight -= vote!.weight;
      if (weight.weight > 0) {
        this.weights.put(args.voter!, weight);
      } else {
        this.weights.remove(args.voter!);
        // no votes from the user, notify KOIN and VHP contracts
        // to avoid calling the koinos fund contract when there
        // are new updates in the balances
        koinContract.set_votes_koinos_fund(args.voter!, false);
        vhpContract.set_votes_koinos_fund(args.voter!, false);
      }

      System.event(
        "fund.update_vote_event",
        Protobuf.encode(
          args,
          fund.update_vote_arguments.encode
        ),
        [args.voter!]
      );

      return new fund.update_vote_result();
    }

    if (weight.weight == 0 && args.weight > 0) {
      // first user vote, notify KOIN and VHP contracts
      // to remember to call the koinos fund contract whenever
      // there are updates in the balances
      koinContract.set_votes_koinos_fund(args.voter!, true);
      vhpContract.set_votes_koinos_fund(args.voter!, true);
    }

    // get ID of the project in the list ordered by votes
    const oldIdByVotes = idByVotes(project!.total_votes, project!.id);

    // get user's KOIN and VHP balance
    const koinBalance = koinContract.balance_of(args.voter!);
    const vhpBalance = vhpContract.balance_of(args.voter!);

    System.require(koinBalance + vhpBalance > 0, "the voter does not have KOIN or VHP balance");

    // if vote already exist update weight and expiration
    if (vote) {
      // we remove the weight previously used, and the new weight will be added later
      weight.weight -= vote.weight;

      // remove votes from the project, the new votes with new weight will be added later.
      // only remove it if it has not expired
      const previousVoteWeight = vote.weight * (koinBalance + vhpBalance);
      for (let i = 0; i < 6; i += 1) {
        if (globalVars!.payment_times[i] == vote.expiration) {
          // there are 6 expiration times, remove it from the corresponding period
          project!.votes[i] -= previousVoteWeight;
          project!.total_votes -= previousVoteWeight;
        }
      }
    }

    // update weights used by the user
    weight.weight += args.weight;
    System.require(weight.weight <= 20, `votes have exceeded 100% by ${5 * weight.weight - 100}%`);
    if (weight.weight > 0) {
      this.weights.put(args.voter!, weight);
    } else {
      this.weights.remove(args.voter!);
      // no votes from the user, notify KOIN and VHP contracts
      // to avoid calling the koinos fund contract when there
      // are new updates in the balances
      koinContract.set_votes_koinos_fund(args.voter!, false);
      vhpContract.set_votes_koinos_fund(args.voter!, false);
    }

    if (args.weight > 0) {
      // update user vote and expiration time (most distant expiration)
      vote = new fund.vote_info(project!.id, args.weight, globalVars!.payment_times[5]);
      this.projectsByVoter.put(keyByVoter, vote);
    } else {
      // remove vote
      this.projectsByVoter.remove(keyByVoter);
    }

    // update votes in the project (votes with most distant expiration)
    const voteWeight = args.weight * (koinBalance + vhpBalance);
    project!.votes[5] += voteWeight;
    project!.total_votes += voteWeight;
    this.projects.put(`${args.project_id}`, project!);

    // reorder project in the list ordered by votes
    const newIdByVotes = idByVotes(project!.total_votes, project!.id);
    if (project!.status == fund.project_status.active) {
      this.activeProjectsByVotes.remove(oldIdByVotes);
      this.activeProjectsByVotes.put(newIdByVotes, new fund.existence());
    } else {
      this.upcomingProjectsByVotes.remove(oldIdByVotes);
      this.upcomingProjectsByVotes.put(newIdByVotes, new fund.existence());
    }

    System.event(
      "fund.update_vote_event",
      Protobuf.encode(
        args,
        fund.update_vote_arguments.encode
      ),
      [args.voter!]
    );

    return new fund.update_vote_result();
  }

  update_votes(args: fund.update_votes_arguments): void {
    const caller = System.getCaller();
    System.require(caller, "no caller. Caller of update votes must be KOIN or VHP contract");

    const globalVars = this.globalVars.get();
    System.require(globalVars, "fund contract not configured");

    const koinAddress = System.getContractAddress("koin");
    const vhpAddress = System.getContractAddress("vhp");
    System.require(
      Arrays.equal(caller.caller, koinAddress) ||
      Arrays.equal(caller.caller, vhpAddress),
      "caller of update votes must be KOIN or VHP contract"
    );

    const koinContract = new Token(koinAddress);
    const vhpContract = new Token(vhpAddress);

    let keyByVoter = new Uint8Array(31);
    keyByVoter.set(args.voter!);

    // get weights used by the user
    const weight = this.weights.get(args.voter!)!;

    let emptyBalanceBothContracts = false;
    if (args.new_balance == 0) {
      if (Arrays.equal(caller.caller, koinAddress)) {
        const vhpBalance = vhpContract.balance_of(args.voter!);
        if (vhpBalance == 0) emptyBalanceBothContracts = true;
      } else {
        const koinBalance = koinContract.balance_of(args.voter!);
        if (koinBalance == 0) emptyBalanceBothContracts = true;
      }
    }

    while (true) {
      const voteRecord = this.projectsByVoter.getNext(keyByVoter);
      if (!voteRecord) break;

      keyByVoter = voteRecord.key!;
      if (!Arrays.equal(keyByVoter.slice(0, 25), args.voter!)) break;

      const vote = voteRecord.value;

      const projectId = u32.parse(StringBytes.bytesToString(keyByVoter.slice(25)));
      const project = this.projects.get(`${projectId}`);

      // update total votes for active and upcoming projects
      if (project!.status != fund.project_status.past) {
        // get ID of the project in the list ordered by votes
        const oldIdByVotes = idByVotes(project!.total_votes, project!.id);

        const deltaVoteWeight: u64 = vote.weight * (args.new_balance - args.old_balance);
        for (let i = 0; i < 6; i += 1) {
          if (globalVars!.payment_times[i] == vote.expiration) {
            // there are 6 expiration times, update the corresponding period
            project!.votes[i] += deltaVoteWeight;
            project!.total_votes += deltaVoteWeight;
          }
        }
        this.projects.put(`${projectId}`, project!);

        // reorder project in the list ordered by votes
        const newIdByVotes = idByVotes(project!.total_votes, project!.id);
        if (project!.status == fund.project_status.active) {
          this.activeProjectsByVotes.remove(oldIdByVotes);
          this.activeProjectsByVotes.put(newIdByVotes, new fund.existence());
        } else {
          this.upcomingProjectsByVotes.remove(oldIdByVotes);
          this.upcomingProjectsByVotes.put(newIdByVotes, new fund.existence());
        }
      }

      // remove user vote if 0 balance or past project
      if (emptyBalanceBothContracts || project!.status == fund.project_status.past) {
        // remove vote from the list of user votes
        this.projectsByVoter.remove(keyByVoter);

        // remove vote from the weights used by the user
        weight.weight -= vote.weight;
        if (weight.weight > 0) {
          this.weights.put(args.voter!, weight);
        } else {
          this.weights.remove(args.voter!);
          // no votes from the user, notify KOIN and VHP contracts
          // to avoid calling the koinos fund contract when there
          // are new updates in the balances
          koinContract.set_votes_koinos_fund(args.voter!, false);
          vhpContract.set_votes_koinos_fund(args.voter!, false);
        }
      }
    }
  }

  pay_projects(): fund.pay_projects_result {
    System.require(System.getCaller().caller_privilege == chain.privilege.kernel_mode, "payments must be called from kernel");
    const now = System.getHeadInfo().head_block_time;
    const globalVars = this.globalVars.get();
    System.require(globalVars, "fund contract not configured");
    const koinToken = new Token(System.getContractAddress("koin"));
    const balance = koinToken.balance_of(this.contractId);
    let budget = 2 * (balance - globalVars!.remaining_balance);
    if (budget > balance) budget = balance;
    let budgetExecuted: u64 = 0;

    // move projects from upcoming to active
    while (true) {
      const upcoming = this.upcomingProjectsByDate.getNext("");
      if (!upcoming) break;
      const startingDate = u64.parse(StringBytes.bytesToString(upcoming.key!.slice(0, 13)));
      const projectId = u32.parse(StringBytes.bytesToString(upcoming.key!.slice(13)));
      if (now < startingDate) break;

      // update project status
      const project = this.projects.get(`${projectId}`);
      project!.status = fund.project_status.active;
      this.projects.put(`${project!.id}`, project!);

      // remove from upcoming projects
      this.upcomingProjectsByVotes.remove(idByVotes(project!.total_votes, project!.id));
      this.upcomingProjectsByDate.remove(StringBytes.bytesToString(upcoming.key!));
      globalVars!.total_upcoming_projects -= 1;

      // add to active projects
      this.activeProjectsByVotes.put(idByVotes(project!.total_votes, project!.id), new fund.existence());
      this.activeProjectsByDate.put(idByDate(project!.end_date, project!.id), new fund.existence());
      globalVars!.total_active_projects += 1;
    }

    // move projects from active to past
    while (true) {
      const active = this.activeProjectsByDate.getNext("");
      if (!active) break;
      const endingDate = u64.parse(StringBytes.bytesToString(active.key!.slice(0, 13)));
      const projectId = u32.parse(StringBytes.bytesToString(active.key!.slice(13)));
      if (now < endingDate) break;

      // update project status
      const project = this.projects.get(`${projectId}`);
      project!.status = fund.project_status.past;
      this.projects.put(`${project!.id}`, project!);

      // remove from active projects
      this.activeProjectsByVotes.remove(idByVotes(project!.total_votes, project!.id));
      this.activeProjectsByDate.remove(StringBytes.bytesToString(active.key!));
      globalVars!.total_active_projects -= 1;

      // add to past projects
      this.pastProjectsByDate.put(StringBytes.bytesToString(active.key!), new fund.existence());
    }

    // get projects to pay
    let nextId = idByVotes(U64.MAX_VALUE, 0);
    while (budget > 0) {
      const active = this.activeProjectsByVotes.getPrev(nextId);
      if (!active) break;
      const projectId = u32(1e6) - u32.parse(StringBytes.bytesToString(active.key!.slice(17)));
      const project = this.projects.get(`${projectId}`);
      const payment = project!.monthly_payment > budget
        ? budget
        : project!.monthly_payment;
      budget -= payment;
      if (payment > 0 &&
        !Arrays.equal(project!.beneficiary, this.contractId) &&
        project!.total_votes > 0
      ) {
        // transfer to beneficiary
        koinToken.transfer(this.contractId, project!.beneficiary!, payment);
        budgetExecuted += payment;
      }
      nextId = StringBytes.bytesToString(active.key!);
    }
    globalVars!.remaining_balance = balance - budgetExecuted;

    // rotate votes for upcoming projects
    nextId = "";
    while (true) {
      const upcoming = this.upcomingProjectsByDate.getNext(nextId);
      if (!upcoming) break;
      const projectId = u32.parse(StringBytes.bytesToString(upcoming.key!.slice(13)));
      const project = this.projects.get(`${projectId}`);
      // move votes 1 position and remove old votes
      const oldVotes = project!.votes.shift();
      // get ID of sorted by votes before updating total votes
      const oldIdByVotes = idByVotes(project!.total_votes, project!.id);
      // the furthest votes from expiring are zero
      project!.votes.push(0);
      project!.total_votes -= oldVotes;
      this.projects.put(`${projectId}`, project!);
      if (oldVotes > 0) {
        // reorder projects by votes
        const newIdByVotes = idByVotes(project!.total_votes, project!.id);
        this.upcomingProjectsByVotes.remove(oldIdByVotes);
        this.upcomingProjectsByVotes.put(newIdByVotes, new fund.existence());
      }
      nextId = StringBytes.bytesToString(upcoming.key!);
    }

    // rotate votes for active projects
    nextId = "";
    while (true) {
      const active = this.activeProjectsByDate.getNext(nextId);
      if (!active) break;
      const projectId = u32.parse(StringBytes.bytesToString(active.key!.slice(13)));
      const project = this.projects.get(`${projectId}`);
      // move votes 1 position and remove old votes
      const oldVotes = project!.votes.shift();
      // get ID of sorted by votes before updating total votes
      const oldIdByVotes = idByVotes(project!.total_votes, project!.id);
      // the furthest votes from expiring are zero
      project!.votes.push(0);
      project!.total_votes -= oldVotes;
      this.projects.put(`${projectId}`, project!);
      if (oldVotes > 0) {
        // reorder projects by votes
        const newIdByVotes = idByVotes(project!.total_votes, project!.id);
        this.activeProjectsByVotes.remove(oldIdByVotes);
        this.activeProjectsByVotes.put(newIdByVotes, new fund.existence());
      }
      nextId = StringBytes.bytesToString(active.key!);
    }

    let newPaymentTime: u64;

    if (BUILD_FOR_TESTING) {
      // TESTNET
      // Payment per day. Calculate the time of 6th day (new payment time in the list)
      newPaymentTime = now + 6 * 24 * 60 * 60 * 1000;
    } else {
      // MAINNET
      // Calculate last day of the month (at noon) 6 months from now
      const date = new Date(i64(now));
      let year = date.getUTCFullYear();
      let month = date.getUTCMonth();
      month += 7;
      if (month > 11) {
        month -= 12;
        year += 1;
      }
      newPaymentTime = Date.UTC(year, month, 1, 0, 0, 0, 0) - 12 * 60 * 60 * 1000;
    }

    // rotate the 6 payment times: Remove the current one and create the new one
    globalVars!.payment_times.shift();
    globalVars!.payment_times.push(newPaymentTime);
    this.globalVars.put(globalVars!);

    // return the next payment time
    return new fund.pay_projects_result(globalVars!.payment_times[0]);
  }
}
