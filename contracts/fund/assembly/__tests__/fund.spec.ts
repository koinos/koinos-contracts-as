import { Base58, MockVM, authority, Arrays, chain, Protobuf, System, kcs4, protocol, system_calls } from "@koinos/sdk-as";
import { Fund } from "../Fund";
import { fund } from "../proto/fund";

const fundAddress = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");
const koinAddress = Base58.decode("1A9YB4wnmUUohsL4jzxCkeMpzZXMVRoohB");
const vhpAddress = Base58.decode("12b1oodJ3jXahLHaHA7A5HX8bpCs9phft6");
const pobAddress = Base58.decode("1C7V1hZfn36cej3vLNJ6zNF41EUcbMdJw6");
const user1 = Base58.decode("1CLyivtwq2h8SnhLfDDNmmvxvGRANDr9XU");
const user2 = Base58.decode("1PWFatQaSXGfkosYwer3U8YrrpsuRc95kJ");
const user3 = Base58.decode("1M77WXDFWk67L54MT7RGyYRp4weagTyQHB");
const user4 = Base58.decode("1JzLa9DvFV8yTizBf8TMiRcM2HHfkW5RWN");
const user5 = Base58.decode("1McdjFeoDXbB9w6uub9G3yutaqZ8zFKXQP");
const user6 = Base58.decode("1KAYVsnRtKuECPYrh4aat1ukV27xRSQhtf");
const user7 = Base58.decode("15ckQxzF3VMotq6zd2Lfd9JvCNGSj6vuGF");
const user8 = Base58.decode("1FM5gXUAJgFJ3s6k5Nni8FAXaoX1Hnph28");
const user9 = Base58.decode("16gyVkaoeZpSbWDQHouRPGD9eH46GH8cTN");
const user10 = Base58.decode("1AV8Bvt6T9aari2mVdkQmX9XnDP2XUpxp7");
const user11 = Base58.decode("1PYbCRDTHNpPZXG5LjeC3ZJS1RHWMS3arT");

enum EntryPoint {
  balanceOf = 0x5c721497, // 1550980247
  mint = 0xdc6f17bb, // 3698268091
  transfer = 0x27f576ca, // 670398154
  setVotesKoinosFund = 0x2178d8fa // 561567994
}

const endMonth1 = 1738324800000; // 2025-01-31T12:00:00.000Z
const endMonth2 = 1740744000000; // 2025-02-28T12:00:00.000Z
const endMonth3 = 1743422400000; // 2025-03-31T12:00:00.000Z
const endMonth4 = 1746014400000; // 2025-04-30T12:00:00.000Z
const endMonth5 = 1748692800000; // 2025-05-31T12:00:00.000Z
const endMonth6 = 1751284800000; // 2025-06-30T12:00:00.000Z
const endMonth7 = 1753963200000; // 2025-07-31T12:00:00.000Z
const endMonth8 = 1756641600000; // 2025-08-31T12:00:00.000Z
const endMonth9 = 1759233600000; // 2025-09-30T12:00:00.000Z
const endMonth10 = 1761912000000; // 2025-10-31T12:00:00.000Z
const endMonth11 = 1764504000000; // 2025-11-30T12:00:00.000Z
const endMonth12 = 1767182400000; // 2025-12-31T12:00:00.000Z
const endMonth13 = 1769860800000; // 2026-01-31T12:00:00.000Z
const endMonth14 = 1772280000000; // 2026-02-28T12:00:00.000Z
const endMonth15 = 1774958400000; // 2026-03-31T12:00:00.000Z

function configureFund(): void {
  // configure fund contract
  MockVM.setSystemAuthority(true);
  const fundContract = new Fund();
  const setGlobalVarsArgs = new fund.set_global_vars_arguments(10000);
  fundContract.set_global_vars(setGlobalVarsArgs);
  MockVM.setSystemAuthority(false);
}

function submitProject(
  creator: Uint8Array = user1,
  beneficiary: Uint8Array = user1,
  title: string = "My project 1",
  monthlyPayment: u64 = 1000_00000000,
  startDate: u64 = 1735689600000, // 2025-01-01T00:00:00.000Z
  endDate: u64 = 1767225600000, // 2026-01-01T00:00:00.000Z
  fee: u64 = 5_00000000,
): void {
  const fundContract = new Fund();

  // response ok from KOIN contract when making the transfer.
  // no extra authorization is needed from the user to submit the project
  MockVM.setCallContractResults([new system_calls.exit_arguments(0, new chain.result())]);

  fundContract.submit_project(
    new fund.submit_project_arguments(
      creator,
      beneficiary,
      title,
      `My description for title ${title}`,
      monthlyPayment,
      startDate,
      endDate,
      fee
    )
  );
}

function voteProject(
  voter: Uint8Array = user2,
  projectId: u32 = 1,
  weight: u32 = 20,
  balances: string = "1000 KOIN / 200 VHP",
  callSetVotesKoinosFundPastVoteRemoved: bool = false,
  callSetVotesKoinosFundNewVote: bool = true,
  callSetVotesKoinosFundVoteRemoved: bool = false,
): void {
  const fundContract = new Fund();

  // voter accepts to vote for the project
  MockVM.setAuthorities(
    [
      new MockVM.MockAuthority(authority.authorization_type.contract_call, voter, true),
    ]
  );

  const voteArguments = new fund.update_vote_arguments(voter, projectId, weight);
  MockVM.setContractArguments(Protobuf.encode(voteArguments, fund.update_vote_arguments.encode));

  const callContractResults: system_calls.exit_arguments[] = [];
  
  // call token contracts to notify that the user had votes in the past
  // but all of them are now removed because they are related to past projects
  if (callSetVotesKoinosFundPastVoteRemoved) {
    // result when calling set_votes_koinos_fund in koin contract
    callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));
    // result when calling set_votes_koinos_fund in vhp contract
    callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));
  }

  // call token contracts to notify that the user is voting for projects
  if (callSetVotesKoinosFundNewVote) {
    // result when calling set_votes_koinos_fund in koin contract
    callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));
    // result when calling set_votes_koinos_fund in vhp contract
    callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));
  }

  // example: "1000 KOIN / 200 VHP"
  const values = balances.split(" ");
  const koinBalance = u64.parse(values[0]) * 100000000;
  const vhpBalance = u64.parse(values[3]) * 100000000;

  // result when getting KOIN balance
  callContractResults.push(
    new system_calls.exit_arguments(0, new chain.result(
      Protobuf.encode(
        new kcs4.balance_of_result(koinBalance),
        kcs4.balance_of_result.encode
      )
    )
  ));

  // result when getting KOIN balance
  callContractResults.push(
    new system_calls.exit_arguments(0, new chain.result(
      Protobuf.encode(
        new kcs4.balance_of_result(vhpBalance),
        kcs4.balance_of_result.encode
      )
    )
  ));

  // call token contracts to notify that the user removed the votes in all projects
  if (callSetVotesKoinosFundVoteRemoved) {
    // result when calling set_votes_koinos_fund in koin contract
    callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));
    // result when calling set_votes_koinos_fund in vhp contract
    callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));
  }

  MockVM.setCallContractResults(callContractResults);

  fundContract.update_vote(voteArguments);
}

function updateBalance(
  voter: Uint8Array = user2,
  change: string = "from 1000 KOIN to 2000 KOIN",
  otherToken: string = "0 VHP"
): void {
  const fundContract = new Fund();
  // example: "from 1000 KOIN to 1500 KOIN"
  const values = change.split(" ");
  const tokenAddress = values[2] == "KOIN" ? koinAddress : vhpAddress;
  const oldBalance = u64.parse(values[1]) * 100000000;
  const newBalance = u64.parse(values[4]) * 100000000;

  const balanceOtherToken = u64.parse(
    otherToken.split(" ")[0]
  ) * 100000000;

  const callContractResults: system_calls.exit_arguments[] = [];

  if (newBalance == 0) {
    // result when getting KOIN or VHP balance of the fund contract
    callContractResults.push(
      new system_calls.exit_arguments(0, new chain.result(
        Protobuf.encode(
          new kcs4.balance_of_result(balanceOtherToken),
          kcs4.balance_of_result.encode
        )
      ))
    );
  }

  // result when calling set_votes_koinos_fund in koin contract (if any)
  callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));

  // result when calling set_votes_koinos_fund in vhp contract (if any)
  callContractResults.push(new system_calls.exit_arguments(0, new chain.result()));

  MockVM.setCallContractResults(callContractResults);

  // special function triggered by KOIN or VHP contract
  MockVM.setCaller(new chain.caller_data(tokenAddress, chain.privilege.user_mode));

  fundContract.update_votes(
    new fund.update_votes_arguments(voter, newBalance, oldBalance)
  );

  // restore caller to user mode
  MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.user_mode));
}

function payProjects(now: u64 = endMonth1 + 30_000, balance: u64 = 1500_00000000, numberOfPayments: i32 = 1): fund.pay_projects_result {
  const fundContract = new Fund();

  // the payment is triggered from the PoB which is in kernel mode
  MockVM.setCaller(new chain.caller_data(pobAddress, chain.privilege.kernel_mode));

  // time of payment is also controlled in the PoB contract
  MockVM.setHeadInfo(new chain.head_info(null, now));

  // result when getting KOIN balance of the fund contract
  const callContractResults: system_calls.exit_arguments[] = [
    new system_calls.exit_arguments(0, new chain.result(
      Protobuf.encode(
        new kcs4.balance_of_result(balance),
        kcs4.balance_of_result.encode
      )
    ))
  ];

  for (let i = 0; i < numberOfPayments; i += 1) {
    // result when making a KOIN transfer (payment)
    callContractResults.push(
      new system_calls.exit_arguments(0, new chain.result(
        Protobuf.encode(
          new kcs4.transfer_result(),
          kcs4.transfer_result.encode
        )
      ))
    );
  }

  MockVM.setCallContractResults(callContractResults);

  const result = fundContract.pay_projects();

  // restore caller to user mode
  MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.user_mode));

  return result;
}

/**
 * the token contracts have a boolean to define if the user is voting
 * for projects or not. This boolean helps to improve the performance
 * because during a transfer of tokens, the fund contract will not be
 * called if the user is not voting. Otherwise it will be called and
 * the votes are updated.
 * 
 * This expect function is used to verify that the KOIN and VHP contracts
 * receive this notification. It should be used when the user votes
 * for the first time, or when all votes are removed.
 */
function expectNotificationToTokenContracts(voter: Uint8Array, type: string = ""): void {
  const callContractArguments = MockVM.getCallContractArguments();

  let k = 0; // position of the call to the koin contract
  let voting = false;
  if (type == "first vote") {
    k = 0;
    voting = true;
    expect(callContractArguments.length).toBe(4); // 2 calls to notify, 2 calls to get balance
  } else if (type == "user removes last vote") {
    k = 2;
    voting = false;
    expect(callContractArguments.length).toBe(4); // 2 calls to get balance, 2 calls to notify
  } else if (type == "vote removed past project") {
    k = 0;
    voting = false;
    expect(callContractArguments.length).toBe(2); // 2 calls to notify
  } else {
    System.fail("invalid type in expectNotificationToTokenContracts");
  }

  // koin contract is called to notify changes
  expect(Base58.encode(callContractArguments[k].contract_id)).toBe(Base58.encode(koinAddress));
  expect(callContractArguments[k].entry_point).toBe(EntryPoint.setVotesKoinosFund);
  let argsSetVotesKF = Protobuf.decode<fund.set_votes_koinos_fund_arguments>(
    callContractArguments[k].args,
    fund.set_votes_koinos_fund_arguments.decode
  );
  expect(`user ${Base58.encode(argsSetVotesKF.account!)} voting? ${argsSetVotesKF.votes_koinos_fund}`).toBe(
    `user ${Base58.encode(voter)} voting? ${voting}`
  );

  // vhp contract is called to notify changes
  expect(Base58.encode(callContractArguments[k+1].contract_id)).toBe(Base58.encode(vhpAddress));
  expect(callContractArguments[k+1].entry_point).toBe(EntryPoint.setVotesKoinosFund);
  argsSetVotesKF = Protobuf.decode<fund.set_votes_koinos_fund_arguments>(
    callContractArguments[k+1].args,
    fund.set_votes_koinos_fund_arguments.decode
  );
  expect(`user ${Base58.encode(argsSetVotesKF.account!)} voting? ${argsSetVotesKF.votes_koinos_fund}`).toBe(
    `user ${Base58.encode(voter)} voting? ${voting}`
  );
}

describe("Fund contract", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(fundAddress);
    MockVM.setContractArguments(new Uint8Array(0));
    MockVM.setContractAddress("koin", koinAddress);
    MockVM.setContractAddress("vhp", vhpAddress);
    MockVM.setEntryPoint(0);
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.user_mode));
    MockVM.setHeadInfo(new chain.head_info(null, 1736899200000, 1)); // 2025-01-15T00:00:00.000Z

    System.resetCache();
  });

  it("should get global vars", () => {
    configureFund();
    const fundContract = new Fund();
    const globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(0);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(0);
    expect(globalVars.remaining_balance).toBe(0);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth1}`,
      `${endMonth2}`,
      `${endMonth3}`,
      `${endMonth4}`,
      `${endMonth5}`,
      `${endMonth6}`,
    ].join(","));
  });

  it("should submit a project", () => {
    configureFund();
    submitProject();
    const fundContract = new Fund();

    const project = fundContract.get_project(
      new fund.get_project_arguments(1)
    );

    const events = MockVM.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("fund.submit_project_event");
    expect(events[0].impacted.length).toBe(2);
    expect(Base58.encode(events[0].impacted[0])).toBe(Base58.encode(user1));
    expect(Base58.encode(events[0].impacted[1])).toBe(Base58.encode(user1));
    const eventArguments = Protobuf.decode<fund.submit_project_arguments>(
      events[0].data,
      fund.submit_project_arguments.decode
    );
    expect(Base58.encode(eventArguments.creator!)).toBe(Base58.encode(user1));
    expect(Base58.encode(eventArguments.beneficiary!)).toBe(Base58.encode(user1));
    expect(eventArguments.title).toBe("My project 1");
    expect(eventArguments.description).toBe("My description for title My project 1");
    expect(eventArguments.monthly_payment).toBe(1000_00000000);
    expect(eventArguments.start_date).toBe(1735689600000);
    expect(eventArguments.end_date).toBe(1767225600000);
    expect(eventArguments.fee).toBe(5_00000000);

    expect(Base58.encode(project.creator!)).toBe(Base58.encode(user1));
    expect(Base58.encode(project.beneficiary!)).toBe(Base58.encode(user1));
    expect(project.title).toBe("My project 1");
    expect(project.description).toBe("My description for title My project 1");
    expect(project.monthly_payment).toBe(1000_00000000);
    expect(project.start_date).toBe(1735689600000); // 2025-01-01T00:00:00.000Z
    expect(project.end_date).toBe(1767225600000); // 2026-01-01T00:00:00.000Z

    // check past projects by date
    let projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.past,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("");

    // check upcoming projects by date
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("");

    // check active projects by date
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("1767225600000000001");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");

    // check past projects by votes - not possible
    expect(() => {
      new Fund().get_projects(new fund.get_projects_arguments(
        fund.project_status.past,
        fund.order_projects_by.by_votes,
        null,
        10
      ));
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe("past projects are not ordered by votes");

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      null,
      10
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      null,
      10
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("00000000000000000999999");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
  });

  it("should vote for a project", () => {
    configureFund();
    submitProject();

    MockVM.clearEvents();
    voteProject();
    const fundContract = new Fund();

    const events = MockVM.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("fund.update_vote_event");
    expect(events[0].impacted.length).toBe(1);
    expect(Base58.encode(events[0].impacted[0])).toBe(Base58.encode(user2));
    const eventArguments = Protobuf.decode<fund.update_vote_arguments>(
      events[0].data,
      fund.update_vote_arguments.decode
    );
    expect(eventArguments.project_id).toBe(1);
    expect(Base58.encode(eventArguments.voter!)).toBe(Base58.encode(user2));
    expect(eventArguments.weight).toBe(20);

    // check active projects by votes
    const projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      null,
      10
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("00002400000000000999999");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].total_votes).toBe(2400000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,2400000000000");

    // get user votes
    const votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user2));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(1);
    expect(votes.votes[0].weight).toBe(20);
    expect(votes.votes[0].expiration).toBe(endMonth6);
  });

  it("should accept only authorized callers for the update in the balance", () => {
    configureFund();
    submitProject();
    voteProject();

    MockVM.commitTransaction();

    // no caller
    MockVM.setCaller(new chain.caller_data());

    expect(() => {
      const fundContract = new Fund();
      fundContract.update_votes(
        new fund.update_votes_arguments(user2, 100_00000000, 10_00000000)
      )
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe("caller of update votes must be KOIN or VHP contract");

    // caller not authorized
    MockVM.setCaller(new chain.caller_data(user2, chain.privilege.user_mode));
    expect(() => {
      const fundContract = new Fund();
      fundContract.update_votes(
        new fund.update_votes_arguments(user2, 100_00000000, 10_00000000)
      )
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe("caller of update votes must be KOIN or VHP contract");
  });

  it("should update votes after an update in the balance", () => {
    configureFund();
    submitProject();
    voteProject();
    updateBalance();
    const fundContract = new Fund();

    // check active projects by votes
    const projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      null,
      10
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("00004400000000000999999");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].total_votes).toBe(4400000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,4400000000000");

    // get user votes
    const votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user2));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(1);
    expect(votes.votes[0].weight).toBe(20);
    expect(votes.votes[0].expiration).toBe(endMonth6);

    // no changes in global vars
    // global vars are updated
    const globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(1);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(1);
    expect(globalVars.remaining_balance).toBe(0);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth1}`,
      `${endMonth2}`,
      `${endMonth3}`,
      `${endMonth4}`,
      `${endMonth5}`,
      `${endMonth6}`,
    ].join(","));
  });

  it("should pay projects", () => {
    configureFund();
    submitProject();
    voteProject();
    MockVM.clearCallContractArguments();
    const result = payProjects();
    const fundContract = new Fund();

    const callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(2);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    const args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 1000 koin
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    const args1 = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(args1.from)}`,
      `to ${Base58.encode(args1.to)}`,
      `value ${args1.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 100000000000`
    ].join(" "));

    // next payment time is in the result
    expect(result.next_payment_time).toBe(endMonth2);

    // global vars are updated
    const globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(1);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(1);
    expect(globalVars.remaining_balance).toBe(500_00000000);
    expect(globalVars.payment_times.toString()).toBe([
      // endMonth1, the current payment time, is removed from the list
      `${endMonth2}`, // the next payment time is endMonth2
      `${endMonth3}`,
      `${endMonth4}`,
      `${endMonth5}`,
      `${endMonth6}`,
      `${endMonth7}`, // there is a new time in the list: endMonth7
    ].join(","));

    // the votes are more closer to expire in the project
    const projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      null,
      10
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("00002400000000000999999");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].total_votes).toBe(2400000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,2400000000000,0");
  });

  it("should increase the fee exponentially with more projects", () => {
    configureFund();
    MockVM.setHeadInfo(new chain.head_info(null, 0));
    const year = u64(365 * 24 * 60 * 60 * 1000);

    // expected fee for a fee_denominator = 10000.
    // This denominator can be updated with a gov proposal
    const expectedFee: u64[] = [
      3153600000,    // project #10:     31.54 koin
      25228800000,   // project #20:    252.29 koin
      85147200000,   // project #30:    851.47 koin
      201830400000,  // project #40:   2018.30 koin
      394200000000,  // project #50:   3942.00 koin
    ];

    for (let i = 1; i <= 50; i += 1) {
      if (i % 10 == 0) {
        const fee = expectedFee[i/10 - 1];
        expect(() => {
          submitProject(user1, user1, "project", u64(100e8), 0, year, 0);
        }).toThrow();
        expect(MockVM.getErrorMessage()).toBe(`the fee must be at least ${fee}`);
        submitProject(user1, user1, "project", u64(100e8), 0, year, fee);
      } else {
        submitProject(user1, user1, "project", u64(100e8), 0, year, u64(1e13));
      }
      MockVM.commitTransaction();
    }
  });

  it("should perform a complete flow with different project and votes", () => {
    configureFund();
    const fundContract = new Fund();

    System.log("Complete flow: Fund contract configured");

    // now is 2025-01-01
    MockVM.setHeadInfo(new chain.head_info(null,
      Date.fromString("2025-01-01").getTime()
    ));

    submitProject(user1, user1, "project 1", u64(12e8),
      Date.fromString("2025-02-15").getTime(), // upcoming
      Date.fromString("2026-02-15").getTime()
    );
    submitProject(user2, user2, "project 2", u64(123e8),
      Date.fromString("2025-01-15").getTime(), // upcoming
      Date.fromString("2025-07-15").getTime()
    );
    submitProject(user3, user3, "project 3", u64(1100e8),
      Date.fromString("2024-10-01").getTime(), // active
      Date.fromString("2027-08-15").getTime()
    );
    submitProject(user4, user4, "project 4", u64(5000e8),
      Date.fromString("2024-11-01").getTime(), // active
      Date.fromString("2025-01-30").getTime()
    );

    MockVM.commitTransaction();

    expect(() =>{
      submitProject(user5, user5, "project 5", u64(18000e8),
        Date.fromString("2024-10-01").getTime(),
        Date.fromString("2027-08-15").getTime()
      );
    }).toThrow(); // the fee has increased because there are more projects
    expect(MockVM.getErrorMessage()).toBe("the fee must be at least 1131840000");

    submitProject(user5, user5, "project 5", u64(18000e8),
      Date.fromString("2024-10-01").getTime(), // active
      Date.fromString("2027-08-15").getTime(),
      1131840000
    );

    MockVM.commitTransaction();

    expect(() => {
      submitProject(user6, user6, "project 6", u64(1500e8),
        Date.fromString("2024-10-01").getTime(),
        Date.fromString("2024-12-15").getTime()
      );
    }).toThrow(); // project in the past
    expect(MockVM.getErrorMessage()).toBe("ending date must be in the future");

    System.log("Complete flow: New projects submitted");

    // check past projects by date
    let projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.past,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("");

    // check upcoming projects by date
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(2);
    expect(projects.start_next_page).toBe("1739577600000000001");
    expect(projects.projects[0].id).toBe(2);
    expect(projects.projects[0].title).toBe("project 2"); // project 2 starts before project 1
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(1);
    expect(projects.projects[1].title).toBe("project 1");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");

    // check active projects by date
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("1818288000000000005");
    expect(projects.projects[0].id).toBe(4); // project 4 is the first one to end
    expect(projects.projects[0].title).toBe("project 4");
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(3); // project 3 and 5 end at the same time, but 3 was submitted first
    expect(projects.projects[1].title).toBe("project 3");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(2);
    expect(projects.start_next_page).toBe("00000000000000000999998");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].title).toBe("project 1"); // same votes but project 1 was submitted first
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(2);
    expect(projects.projects[1].title).toBe("project 2");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(3); // same votes. Ordered by time of submission
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(4); // project 4 is the first one to end
    expect(projects.projects[1].title).toBe("project 4");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: User 6 votes");

    // users start to vote
    MockVM.clearCallContractArguments();
    voteProject(user6, 4, 5, "1000000 KOIN / 0 VHP", false, true, false);
    expectNotificationToTokenContracts(user6, "first vote");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(4); // project 4 has more votes
    expect(projects.projects[0].title).toBe("project 4");
    expect(projects.projects[0].total_votes).toBe(5000000_00000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,500000000000000");
    expect(projects.projects[1].id).toBe(3);
    expect(projects.projects[1].title).toBe("project 3");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: User 6 changes weight in vote");

    // change of vote (from weigth 5 to weigth 7)
    voteProject(user6, 4, 7, "1000000 KOIN / 0 VHP", false, false, false);

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(4); // project 4 has more votes
    expect(projects.projects[0].title).toBe("project 4");
    expect(projects.projects[0].total_votes).toBe(7000000_00000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,700000000000000");
    expect(projects.projects[1].id).toBe(3);
    expect(projects.projects[1].title).toBe("project 3");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    // get user votes
    let votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user6));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(4);
    expect(votes.votes[0].weight).toBe(7);
    expect(votes.votes[0].expiration).toBe(endMonth6);

    System.log("Complete flow: User 6 makes a KOIN transfer");

    // there is a change in the balance of the user
    updateBalance(user6, "from 1000000 KOIN to 3 KOIN");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(4); // project 4 has more votes
    expect(projects.projects[0].title).toBe("project 4");
    expect(projects.projects[0].total_votes).toBe(21_00000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,2100000000");
    expect(projects.projects[1].id).toBe(3);
    expect(projects.projects[1].title).toBe("project 3");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    // get user votes
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user6));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(4);
    expect(votes.votes[0].weight).toBe(7);
    expect(votes.votes[0].expiration).toBe(endMonth6);

    System.log("Complete flow: User 6 removes vote");

    // user removes the vote
    MockVM.clearEvents();
    MockVM.clearCallContractArguments();
    voteProject(user6, 4, 0, "3 KOIN / 0 VHP", false, false, true);
    expectNotificationToTokenContracts(user6, "user removes last vote");

    const events = MockVM.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("fund.update_vote_event");
    expect(events[0].impacted.length).toBe(1);
    expect(Base58.encode(events[0].impacted[0])).toBe(Base58.encode(user6));
    const eventArguments = Protobuf.decode<fund.update_vote_arguments>(
      events[0].data,
      fund.update_vote_arguments.decode
    );
    expect(eventArguments.project_id).toBe(4);
    expect(Base58.encode(eventArguments.voter!)).toBe(Base58.encode(user6));
    expect(eventArguments.weight).toBe(0);

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(3); // same votes. Ordered by time of submission
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(4); // project 4 is the first one to end
    expect(projects.projects[1].title).toBe("project 4");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    // get user votes
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user6));
    expect(votes.votes.length).toBe(0);

    System.log("Complete flow: End of 1st month, payment of projects");

    // payment of projects
    MockVM.clearCallContractArguments();
    let resultPayProjects = payProjects(endMonth1, u64(10_000e8));

    // no payment is done
    let callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(1); // only 1 call to koin to get balance
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    let args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth2);

    // global vars are updated
    let globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(5);
    expect(globalVars.total_upcoming_projects).toBe(1);
    expect(globalVars.total_active_projects).toBe(3);
    expect(globalVars.remaining_balance).toBe(u64(10_000e8)); // nothing spent
    expect(globalVars.payment_times.toString()).toBe([
      // endMonth1, the current payment time, is removed from the list
      `${endMonth2}`, // the next payment time is endMonth2
      `${endMonth3}`,
      `${endMonth4}`,
      `${endMonth5}`,
      `${endMonth6}`,
      `${endMonth7}`, // there is a new time in the list: endMonth7
    ].join(","));

    // check past projects by date
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.past,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("1738195200000000004");
    expect(projects.projects[0].id).toBe(4); // project 4 has ended
    expect(projects.projects[0].title).toBe("project 4");
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("00000000000000000999999");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].title).toBe("project 1"); // same votes but project 1 was submitted first
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(2);
    expect(projects.projects[0].title).toBe("project 2");
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(3); // same votes. Ordered by time of submission
    expect(projects.projects[1].title).toBe("project 3");
    expect(projects.projects[1].total_votes).toBe(0);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    // more users vote
    System.log("Complete flow: Multiple votes from users");

    voteProject(user7, 3, 6, "5000 KOIN / 1000 VHP", false, true, false);
    voteProject(user7, 5, 6, "5000 KOIN / 1000 VHP", false, false, false);
    voteProject(user8, 3, 6, "7000 KOIN / 0 VHP", false, true, false);
    voteProject(user8, 1, 14, "7000 KOIN / 0 VHP", false, false, false);
    voteProject(user9, 3, 20, "12000 KOIN / 500 VHP", false, true, false);

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(1);
    expect(projects.start_next_page).toBe("00009800000000000999999");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].title).toBe("project 1"); // same votes but project 1 was submitted first
    expect(projects.projects[0].total_votes).toBe(9800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,9800000000000");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(3);
    expect(projects.start_next_page).toBe("00000000000000000999998");
    expect(projects.projects[0].id).toBe(3);
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(32800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,32800000000000");
    expect(projects.projects[1].id).toBe(5);
    expect(projects.projects[1].title).toBe("project 5");
    expect(projects.projects[1].total_votes).toBe(3600000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,0,3600000000000");
    expect(projects.projects[2].id).toBe(2);
    expect(projects.projects[2].title).toBe("project 2");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: End of 2nd month, payment of projects");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth2, u64(20_000e8), 3);

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(4);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 1100 koin to project 3
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    let argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user3)}`,
      `value 110000000000`
    ].join(" "));

    // KOIN contract called to make a payment of 18000 koin to project 5
    expect(Base58.encode(callContractArguments[2].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[2].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[2].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 1200000000`
    ].join(" "));

    // KOIN contract called to make a payment of 18000 koin to project 5
    expect(Base58.encode(callContractArguments[3].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[3].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[3].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user5)}`,
      `value 1800000000000`
    ].join(" "));

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth3);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(5);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(4);
    expect(globalVars.remaining_balance).toBe(888_00000000);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth3}`,
      `${endMonth4}`,
      `${endMonth5}`,
      `${endMonth6}`,
      `${endMonth7}`,
      `${endMonth8}`,
    ].join(","));

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999998");
    expect(projects.projects[0].id).toBe(3);
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(32800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,32800000000000,0");
    expect(projects.projects[1].id).toBe(1);
    expect(projects.projects[1].title).toBe("project 1");
    expect(projects.projects[1].total_votes).toBe(9800000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,0,9800000000000,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(3600000000000);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,3600000000000,0");
    expect(projects.projects[3].id).toBe(2);
    expect(projects.projects[3].title).toBe("project 2");
    expect(projects.projects[3].total_votes).toBe(0);
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: End of 3rd month, payment of projects");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth3, u64(10_888e8), 3);

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(4);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 1100 koin to project 3
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user3)}`,
      `value 110000000000`
    ].join(" "));

    // KOIN contract called to make a payment of 12 koin to project 1
    expect(Base58.encode(callContractArguments[2].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[2].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[2].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 1200000000`
    ].join(" "));

    // KOIN contract called to make a payment of 18000 koin to project 5
    expect(Base58.encode(callContractArguments[3].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[3].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[3].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user5)}`,
      `value 977600000000` // it cannot get the complete payment, all budget was consumed
    ].join(" "));

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth4);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(5);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(4);
    expect(globalVars.remaining_balance).toBe(0);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth4}`,
      `${endMonth5}`,
      `${endMonth6}`,
      `${endMonth7}`,
      `${endMonth8}`,
      `${endMonth9}`,
    ].join(","));

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999998");
    expect(projects.projects[0].id).toBe(3);
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(32800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,32800000000000,0,0");
    expect(projects.projects[1].id).toBe(1);
    expect(projects.projects[1].title).toBe("project 1");
    expect(projects.projects[1].total_votes).toBe(9800000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,9800000000000,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(3600000000000);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,3600000000000,0,0");
    expect(projects.projects[3].id).toBe(2);
    expect(projects.projects[3].title).toBe("project 2");
    expect(projects.projects[3].total_votes).toBe(0);
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");

    // user 8 decides to renew the vote
    System.log("Complete flow: User 8 renew the vote to not expire");
    voteProject(user8, 3, 6, "7000 KOIN / 0 VHP", false, false, false);

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999998");
    expect(projects.projects[0].id).toBe(3);
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(32800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,28600000000000,0,4200000000000");
    expect(projects.projects[1].id).toBe(1);
    expect(projects.projects[1].title).toBe("project 1");
    expect(projects.projects[1].total_votes).toBe(9800000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,9800000000000,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(3600000000000);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,3600000000000,0,0");
    expect(projects.projects[3].id).toBe(2);
    expect(projects.projects[3].title).toBe("project 2");
    expect(projects.projects[3].total_votes).toBe(0);
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: End of 4th month, payment of projects");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth4, u64(10_000e8), 3);

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(4);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 1100 koin to project 3
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user3)}`,
      `value 110000000000`
    ].join(" "));

    // KOIN contract called to make a payment of 12 koin to project 1
    expect(Base58.encode(callContractArguments[2].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[2].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[2].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 1200000000`
    ].join(" "));

    // KOIN contract called to make a payment of 18000 koin to project 5
    expect(Base58.encode(callContractArguments[3].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[3].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[3].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user5)}`,
      `value 888800000000` // it cannot get the complete payment, all budget was consumed
    ].join(" "));

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth5);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(5);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(4);
    expect(globalVars.remaining_balance).toBe(0);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth5}`,
      `${endMonth6}`,
      `${endMonth7}`,
      `${endMonth8}`,
      `${endMonth9}`,
      `${endMonth10}`,
    ].join(","));

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999998");
    expect(projects.projects[0].id).toBe(3);
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(32800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,28600000000000,0,4200000000000,0");
    expect(projects.projects[1].id).toBe(1);
    expect(projects.projects[1].title).toBe("project 1");
    expect(projects.projects[1].total_votes).toBe(9800000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,0,9800000000000,0,0,0");
    expect(projects.projects[2].id).toBe(5);
    expect(projects.projects[2].title).toBe("project 5");
    expect(projects.projects[2].total_votes).toBe(3600000000000);
    expect(projects.projects[2].votes.toString()).toBe("0,0,3600000000000,0,0,0");
    expect(projects.projects[3].id).toBe(2);
    expect(projects.projects[3].title).toBe("project 2");
    expect(projects.projects[3].total_votes).toBe(0);
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: User votes but then empties his wallet completely when making a transfer");

    MockVM.commitTransaction();
    expect(() => {
      voteProject(user10, 2, 20, "0 KOIN / 0 VHP", false, true, false);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe("the voter does not have KOIN or VHP balance");

    voteProject(user10, 2, 20, "0 KOIN / 100 VHP", false, true, false);
    updateBalance(user10, "from 0 KOIN to 100 KOIN");

    let project = fundContract.get_project(new fund.get_project_arguments(2));
    expect(project.id).toBe(2);
    expect(project.title).toBe("project 2");
    expect(project.total_votes).toBe(400000000000);
    expect(project.votes.toString()).toBe("0,0,0,0,0,400000000000");

    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user10));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(2);
    expect(votes.votes[0].weight).toBe(20);
    expect(votes.votes[0].expiration).toBe(endMonth10);

    updateBalance(user10, "from 100 KOIN to 0 KOIN", "100 VHP");
    // the user still has 100 VHP and he is voting

    project = fundContract.get_project(new fund.get_project_arguments(2));
    expect(project.id).toBe(2);
    expect(project.title).toBe("project 2");
    expect(project.total_votes).toBe(200000000000);
    expect(project.votes.toString()).toBe("0,0,0,0,0,200000000000");

    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user10));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(2);
    expect(votes.votes[0].weight).toBe(20);
    expect(votes.votes[0].expiration).toBe(endMonth10);

    updateBalance(user10, "from 100 VHP to 0 VHP", "0 KOIN");
    // the user has 0 in KOIN and VHP, the vote should be removed

    project = fundContract.get_project(new fund.get_project_arguments(2));
    expect(project.id).toBe(2);
    expect(project.title).toBe("project 2");
    expect(project.total_votes).toBe(0);
    expect(project.votes.toString()).toBe("0,0,0,0,0,0");

    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user10));
    expect(votes.votes.length).toBe(0);

    System.log("Complete flow: New project submitted to not spend, return the savings to the Fund contract");

    submitProject(user1, fundAddress, "Return project", u64(500_000_000e8),
      Date.fromString("2025-04-15").getTime(), // active
      Date.fromString("2050-04-01").getTime(),
      100_00000000 // fee 100 koin
    );

    // the new return proposal is voted
    voteProject(user7, 6, 8, "5000 KOIN / 1000 VHP", false, false, false);

    // few votes in other projects with low value
    voteProject(user10, 2, 5, "35 KOIN / 0 VHP", false, true, false);
    voteProject(user11, 2, 10, "0 KOIN / 1 VHP", false, true, false);

    System.log("Complete flow: End of 5th month, payment of projects");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth5, u64(10_000e8), 2);

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(3);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 1100 koin to project 3
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user3)}`,
      `value 110000000000`
    ].join(" "));

    // KOIN contract called to make a payment of 12 koin to project 1
    expect(Base58.encode(callContractArguments[2].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[2].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[2].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 1200000000`
    ].join(" "));

    // project 5 does not receive payment this time because the return proposal
    // has more votes

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth6);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(6);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(5);
    expect(globalVars.remaining_balance).toBe(8888_00000000);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth6}`,
      `${endMonth7}`,
      `${endMonth8}`,
      `${endMonth9}`,
      `${endMonth10}`,
      `${endMonth11}`,
    ].join(","));

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(5);
    expect(projects.start_next_page).toBe("00000018500000000999998");
    expect(projects.projects[0].id).toBe(3);
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(32800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,28600000000000,0,4200000000000,0,0");
    expect(projects.projects[1].id).toBe(1);
    expect(projects.projects[1].title).toBe("project 1");
    expect(projects.projects[1].total_votes).toBe(9800000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,9800000000000,0,0,0,0");
    expect(projects.projects[2].id).toBe(6);
    expect(projects.projects[2].title).toBe("Return project");
    expect(projects.projects[2].total_votes).toBe(4800000000000);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,4800000000000,0");
    expect(projects.projects[3].id).toBe(5);
    expect(projects.projects[3].title).toBe("project 5");
    expect(projects.projects[3].total_votes).toBe(3600000000000);
    expect(projects.projects[3].votes.toString()).toBe("0,3600000000000,0,0,0,0");
    expect(projects.projects[4].id).toBe(2);
    expect(projects.projects[4].title).toBe("project 2");
    expect(projects.projects[4].total_votes).toBe(18500000000);
    expect(projects.projects[4].votes.toString()).toBe("0,0,0,0,18500000000,0");

    System.log("Complete flow: End of 6th month, payment of projects");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth6, u64(18_888e8), 2);

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(3);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 1100 koin to project 3
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user3)}`,
      `value 110000000000`
    ].join(" "));

    // KOIN contract called to make a payment of 12 koin to project 1
    expect(Base58.encode(callContractArguments[2].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[2].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[2].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 1200000000`
    ].join(" "));

    // project 5 does not receive payment this time because the return proposal
    // has more votes

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth7);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(6);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(5);
    expect(globalVars.remaining_balance).toBe(17776_00000000);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth7}`,
      `${endMonth8}`,
      `${endMonth9}`,
      `${endMonth10}`,
      `${endMonth11}`,
      `${endMonth12}`,
    ].join(","));

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(5);
    expect(projects.start_next_page).toBe("00000018500000000999998");
    expect(projects.projects[0].id).toBe(3);
    expect(projects.projects[0].title).toBe("project 3");
    expect(projects.projects[0].total_votes).toBe(32800000000000);
    expect(projects.projects[0].votes.toString()).toBe("28600000000000,0,4200000000000,0,0,0");
    expect(projects.projects[1].id).toBe(1);
    expect(projects.projects[1].title).toBe("project 1");
    expect(projects.projects[1].total_votes).toBe(9800000000000);
    expect(projects.projects[1].votes.toString()).toBe("9800000000000,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(6);
    expect(projects.projects[2].title).toBe("Return project");
    expect(projects.projects[2].total_votes).toBe(4800000000000);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,4800000000000,0,0");
    expect(projects.projects[3].id).toBe(5);
    expect(projects.projects[3].title).toBe("project 5");
    expect(projects.projects[3].total_votes).toBe(3600000000000);
    expect(projects.projects[3].votes.toString()).toBe("3600000000000,0,0,0,0,0");
    expect(projects.projects[4].id).toBe(2);
    expect(projects.projects[4].title).toBe("project 2");
    expect(projects.projects[4].total_votes).toBe(18500000000);
    expect(projects.projects[4].votes.toString()).toBe("0,0,0,18500000000,0,0");

    System.log("Complete flow: End of 7th month, payment of projects, some votes expire");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth7, u64(27_776e8), 2);

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(3);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 1100 koin to project 3
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user3)}`,
      `value 110000000000`
    ].join(" "));

    // KOIN contract called to make a payment of 12 koin to project 1
    expect(Base58.encode(callContractArguments[2].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[2].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[2].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 1200000000`
    ].join(" "));

    // project 5 does not receive payment this time because the return proposal
    // has more votes

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth8);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(6);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(4);
    expect(globalVars.remaining_balance).toBe(26664_00000000);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth8}`,
      `${endMonth9}`,
      `${endMonth10}`,
      `${endMonth11}`,
      `${endMonth12}`,
      `${endMonth13}`,
    ].join(","));

    // check past projects by date
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.past,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(2);
    expect(projects.start_next_page).toBe("1752537600000000002");
    expect(projects.projects[0].id).toBe(4);
    expect(projects.projects[0].title).toBe("project 4");
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(2);
    expect(projects.projects[1].title).toBe("project 2");
    expect(projects.projects[1].total_votes).toBe(18500000000);
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,18500000000,0,0");

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));

    // some votes expired and project 2 is removed from active projects (ended)
    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(6);
    expect(projects.projects[0].title).toBe("Return project");
    expect(projects.projects[0].total_votes).toBe(4800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,4800000000000,0,0,0");
    expect(projects.projects[1].id).toBe(3);
    expect(projects.projects[1].title).toBe("project 3");
    expect(projects.projects[1].total_votes).toBe(4200000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,4200000000000,0,0,0,0");
    expect(projects.projects[2].id).toBe(1);
    expect(projects.projects[2].title).toBe("project 1");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[3].id).toBe(5);
    expect(projects.projects[3].title).toBe("project 5");
    expect(projects.projects[3].total_votes).toBe(0);
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");

    // get votes of user6
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user6));
    expect(votes.votes.length).toBe(0);

    // get votes of user7
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user7));
    expect(votes.votes.length).toBe(3);
    expect(votes.votes[0].project_id).toBe(3);
    expect(votes.votes[0].weight).toBe(6);
    expect(votes.votes[0].expiration).toBe(endMonth7); // this vote expired but still exists here
    expect(votes.votes[1].project_id).toBe(5);
    expect(votes.votes[1].weight).toBe(6);
    expect(votes.votes[1].expiration).toBe(endMonth7); // this vote expired but still exists here
    expect(votes.votes[2].project_id).toBe(6);
    expect(votes.votes[2].weight).toBe(8);
    expect(votes.votes[2].expiration).toBe(endMonth10);

    // get votes of user8
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user8));
    expect(votes.votes.length).toBe(2);
    expect(votes.votes[0].project_id).toBe(1);
    expect(votes.votes[0].weight).toBe(14);
    expect(votes.votes[0].expiration).toBe(endMonth7); // this vote expired but still exists here
    expect(votes.votes[1].project_id).toBe(3);
    expect(votes.votes[1].weight).toBe(6);
    expect(votes.votes[1].expiration).toBe(endMonth9);

    // get votes of user9
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user9));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(3);
    expect(votes.votes[0].weight).toBe(20);
    expect(votes.votes[0].expiration).toBe(endMonth7); // this vote expired but still exists here

    // get votes of user10
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user10));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(2); // is now a past project
    expect(votes.votes[0].weight).toBe(5);
    expect(votes.votes[0].expiration).toBe(endMonth10); // this vote has not expired but the project ended

    // get votes of user11
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user11));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(2); // is now a past project
    expect(votes.votes[0].weight).toBe(10);
    expect(votes.votes[0].expiration).toBe(endMonth10); // this vote has not expired but the project ended

    System.log("Complete flow: Users do different things with the expired votes: Do nothing, Renew the vote, Remove the vote, Update the balance");

    // renew vote
    voteProject(user8, 1, 14, "7000 KOIN / 0 VHP", false, false, false);
    
    // remove vote
    voteProject(user7, 3, 0, "5000 KOIN / 1000 VHP", false, false, true);
    
    // update balance
    MockVM.clearCallContractArguments();
    updateBalance(user9, "from 500 VHP to 1500 VHP");
    MockVM.commitTransaction();
    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(0); // token contracts are not called back

    // try to renew vote of the past project
    expect(() => {
      voteProject(user10, 2, 5, "35 KOIN / 0 VHP", true, false, false);
    }).toThrow();
    expect(MockVM.getErrorMessage()).toBe("cannot update vote on past project, only remove vote");

    // remove vote past project
    MockVM.clearCallContractArguments();
    voteProject(user10, 2, 0, "35 KOIN / 0 VHP", true, false, false);
    expectNotificationToTokenContracts(user10, "vote removed past project");

    // update balance for a user voting for a past project
    MockVM.clearCallContractArguments();
    updateBalance(user11, "from 1 VHP to 500 VHP");
    // expect a notification to the token contracts that the user is
    // not voting anymore (the last vote was for a past project)
    expectNotificationToTokenContracts(user11, "vote removed past project");

    // get votes of user7
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user7));
    expect(votes.votes.length).toBe(2); // vote to project 3 has been removed
    expect(votes.votes[0].project_id).toBe(5);
    expect(votes.votes[0].weight).toBe(6);
    expect(votes.votes[0].expiration).toBe(endMonth7); // this vote expired but still exists here
    expect(votes.votes[1].project_id).toBe(6);
    expect(votes.votes[1].weight).toBe(8);
    expect(votes.votes[1].expiration).toBe(endMonth10);

    // get votes of user8
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user8));
    expect(votes.votes.length).toBe(2);
    expect(votes.votes[0].project_id).toBe(1);
    expect(votes.votes[0].weight).toBe(14);
    expect(votes.votes[0].expiration).toBe(endMonth13); // vote renewed
    expect(votes.votes[1].project_id).toBe(3);
    expect(votes.votes[1].weight).toBe(6);
    expect(votes.votes[1].expiration).toBe(endMonth9);

    // get votes of user9
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user9));
    expect(votes.votes.length).toBe(1);
    expect(votes.votes[0].project_id).toBe(3);
    expect(votes.votes[0].weight).toBe(20);
    expect(votes.votes[0].expiration).toBe(endMonth7); // this vote expired but still exists here

    // get votes of user10
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user10));
    expect(votes.votes.length).toBe(0); // user removed the vote, of the past project, in a transaction

    // get votes of user11
    votes = fundContract.get_user_votes(new fund.get_user_votes_arguments(user11));
    expect(votes.votes.length).toBe(0); // the contract removed the vote, of the past project, automatically after updating the balance

    // check past projects by date
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.past,
      fund.order_projects_by.by_date,
      null,
      10
    ));
    expect(projects.projects.length).toBe(2);
    expect(projects.start_next_page).toBe("1752537600000000002");
    expect(projects.projects[0].id).toBe(4);
    expect(projects.projects[0].title).toBe("project 4");
    expect(projects.projects[0].total_votes).toBe(0);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[1].id).toBe(2);
    expect(projects.projects[1].title).toBe("project 2");
    expect(projects.projects[1].total_votes).toBe(18500000000); // individual votes are gone but we keep the total
    expect(projects.projects[1].votes.toString()).toBe("0,0,0,18500000000,0,0");

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));

    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].title).toBe("project 1");
    expect(projects.projects[0].total_votes).toBe(9800000000000); // user8 renewed the vote and now this project can receive payments again
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,0,9800000000000");
    expect(projects.projects[1].id).toBe(6);
    expect(projects.projects[1].title).toBe("Return project");
    expect(projects.projects[1].total_votes).toBe(4800000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,0,4800000000000,0,0,0");
    expect(projects.projects[2].id).toBe(3);
    expect(projects.projects[2].title).toBe("project 3");         // user7 user8 and user9 were voting for this project:
    expect(projects.projects[2].total_votes).toBe(4200000000000); // user7 removed the vote after the expiration, user8 renewed it, and user9 updated the balance without renewing it.
    expect(projects.projects[2].votes.toString()).toBe("0,4200000000000,0,0,0,0"); // then only the votes of user8 are effective
    expect(projects.projects[3].id).toBe(5);
    expect(projects.projects[3].title).toBe("project 5"); // user7 is still voting for this project
    expect(projects.projects[3].total_votes).toBe(0);     // but he did nothing after the expiration then it is not effective
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: End of 8th month, payment of projects");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth8, u64(18e8), 1);

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(2);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 12 koin to project 1
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 1200000000`
    ].join(" "));

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth9);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(6);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(4);
    expect(globalVars.remaining_balance).toBe(6_00000000);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth9}`,
      `${endMonth10}`,
      `${endMonth11}`,
      `${endMonth12}`,
      `${endMonth13}`,
      `${endMonth14}`,
    ].join(","));

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].title).toBe("project 1");
    expect(projects.projects[0].total_votes).toBe(9800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,0,9800000000000,0");
    expect(projects.projects[1].id).toBe(6);
    expect(projects.projects[1].title).toBe("Return project");
    expect(projects.projects[1].total_votes).toBe(4800000000000);
    expect(projects.projects[1].votes.toString()).toBe("0,4800000000000,0,0,0,0");
    expect(projects.projects[2].id).toBe(3);
    expect(projects.projects[2].title).toBe("project 3");
    expect(projects.projects[2].total_votes).toBe(4200000000000);
    expect(projects.projects[2].votes.toString()).toBe("4200000000000,0,0,0,0,0");
    expect(projects.projects[3].id).toBe(5);
    expect(projects.projects[3].title).toBe("project 5");
    expect(projects.projects[3].total_votes).toBe(0);
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");

    System.log("Complete flow: End of 9th month, payment of projects, check budget");

    MockVM.clearCallContractArguments();
    resultPayProjects = payProjects(endMonth9, u64(9e8), 1);
    // last time there was 6 remaining KOIN, and now there are 8 KOIN.
    // So this month the inflation was 9-6= 3 KOIN.
    // If the inflation is 3 KOIN, then the budget of this month is 6 KOIN, the double.

    callContractArguments = MockVM.getCallContractArguments();
    expect(callContractArguments.length).toBe(2);

    // KOIN contract called to get balance of fund contract
    expect(Base58.encode(callContractArguments[0].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[0].entry_point).toBe(EntryPoint.balanceOf);
    args0 = Protobuf.decode<kcs4.balance_of_arguments>(
      callContractArguments[0].args,
      kcs4.balance_of_arguments.decode
    );
    expect(Base58.encode(args0.owner)).toBe(Base58.encode(fundAddress));

    // KOIN contract called to make a payment of 6 koin to project 1, despite project 1 expects 12 koin
    expect(Base58.encode(callContractArguments[1].contract_id)).toBe(Base58.encode(koinAddress));
    expect(callContractArguments[1].entry_point).toBe(EntryPoint.transfer);
    argsT = Protobuf.decode<kcs4.transfer_arguments>(
      callContractArguments[1].args,
      kcs4.transfer_arguments.decode
    );
    expect([
      `from ${Base58.encode(argsT.from)}`,
      `to ${Base58.encode(argsT.to)}`,
      `value ${argsT.value}`
    ].join(" ")).toBe([
      `from ${Base58.encode(fundAddress)}`,
      `to ${Base58.encode(user1)}`,
      `value 600000000` // project 1 expects 12 koin, and the fund has money for that, but the budget of this month is just 6 koin
    ].join(" "));

    // next payment time is in the result
    expect(resultPayProjects.next_payment_time).toBe(endMonth10);

    // global vars are updated
    globalVars = fundContract.get_global_vars();
    expect(globalVars.fee_denominator).toBe(10000);
    expect(globalVars.total_projects).toBe(6);
    expect(globalVars.total_upcoming_projects).toBe(0);
    expect(globalVars.total_active_projects).toBe(4);
    expect(globalVars.remaining_balance).toBe(3_00000000);
    expect(globalVars.payment_times.toString()).toBe([
      `${endMonth10}`,
      `${endMonth11}`,
      `${endMonth12}`,
      `${endMonth13}`,
      `${endMonth14}`,
      `${endMonth15}`,
    ].join(","));

    // check upcoming projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.upcoming,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(0);
    expect(projects.start_next_page).toBe("99999999999999999999999");

    // check active projects by votes
    projects = fundContract.get_projects(new fund.get_projects_arguments(
      fund.project_status.active,
      fund.order_projects_by.by_votes,
      "99999999999999999999999",
      10,
      true, // descending
    ));
    expect(projects.projects.length).toBe(4);
    expect(projects.start_next_page).toBe("00000000000000000999995");
    expect(projects.projects[0].id).toBe(1);
    expect(projects.projects[0].title).toBe("project 1");
    expect(projects.projects[0].total_votes).toBe(9800000000000);
    expect(projects.projects[0].votes.toString()).toBe("0,0,0,9800000000000,0,0");
    expect(projects.projects[1].id).toBe(6);
    expect(projects.projects[1].title).toBe("Return project");
    expect(projects.projects[1].total_votes).toBe(4800000000000);
    expect(projects.projects[1].votes.toString()).toBe("4800000000000,0,0,0,0,0");
    expect(projects.projects[2].id).toBe(3);
    expect(projects.projects[2].title).toBe("project 3");
    expect(projects.projects[2].total_votes).toBe(0);
    expect(projects.projects[2].votes.toString()).toBe("0,0,0,0,0,0");
    expect(projects.projects[3].id).toBe(5);
    expect(projects.projects[3].title).toBe("project 5");
    expect(projects.projects[3].total_votes).toBe(0);
    expect(projects.projects[3].votes.toString()).toBe("0,0,0,0,0,0");
  });
});