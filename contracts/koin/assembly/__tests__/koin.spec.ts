import { Base58, MockVM, authority, Arrays, chain, Protobuf, System, kcs4, protocol, system_calls } from "@koinos/sdk-as";
import { Koin } from "../Koin";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");

const MOCK_ACCT1 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG");
const MOCK_ACCT2 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqK");
const MOCK_ACCT3 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqP");

const headBlock = new protocol.block(new Uint8Array(0), new protocol.block_header(new Uint8Array(0), 10));

describe("koin", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
    MockVM.setContractArguments(CONTRACT_ID); // Dummy value
    MockVM.setEntryPoint(0);
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.user_mode));
    MockVM.setBlock(headBlock);
    MockVM.setContractMetadata(new chain.contract_metadata_object(new Uint8Array(0), false, false, false, false));
    MockVM.setHeadInfo(new chain.head_info(null, 0, 1));

    System.resetCache();
  });

  it("should get the name", () => {
    const koinContract = new Koin();
    const res = koinContract.name();
    expect(res.value).toBe("Koin");
  });

  it("should get the symbol", () => {
    const koinContract = new Koin();
    const res = koinContract.symbol();
    expect(res.value).toBe("KOIN");
  });

  it("should get the decimals", () => {
    const koinContract = new Koin();
    const res = koinContract.decimals();
    expect(res.value).toBe(8);
  });

  it("should get token info", () => {
    const koinContract = new Koin();
    const res = koinContract.get_info();
    expect(res.name).toBe("Koin");
    expect(res.symbol).toBe("KOIN");
    expect(res.decimals).toBe(8);
  });

  it("should/not burn tokens", () => {
    const koinContract = new Koin();
    let callerData = new chain.caller_data();
    callerData.caller = CONTRACT_ID;
    callerData.caller_privilege = chain.privilege.kernel_mode;
    MockVM.setCaller(callerData);

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    let auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
    MockVM.setAuthorities([auth]);

    // check total supply
    let totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    koinContract.mint(mintArgs);

    totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);

    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([auth]);

    // burn tokens
    koinContract.burn(new kcs4.burn_arguments(MOCK_ACCT1, 10));

    // check events
    const events = MockVM.getEvents();
    expect(events.length).toBe(2);
    expect(events[0].name).toBe('token.mint_event');
    expect(events[0].impacted.length).toBe(1);
    expect(Arrays.equal(events[0].impacted[0], MOCK_ACCT1)).toBe(true);
    expect(events[1].name).toBe('token.burn_event');
    expect(events[1].impacted.length).toBe(1);
    expect(Arrays.equal(events[1].impacted[0], MOCK_ACCT1)).toBe(true);

    const burnEvent = Protobuf.decode<kcs4.burn_event>(events[1].data, kcs4.burn_event.decode);
    expect(Arrays.equal(burnEvent.from, MOCK_ACCT1)).toBe(true);
    expect(burnEvent.value).toBe(10);

    // check balance
    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    // check total supply
    totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(113);

    // save the MockVM state because the burn is going to revert the transaction
    MockVM.commitTransaction();

    // does not burn tokens
    expect(() => {
      const koinContract = new Koin();
      const burnArgs = new kcs4.burn_arguments(MOCK_ACCT1, 200);
      koinContract.burn(burnArgs);
    }).toThrow();

    // check error message
    expect(MockVM.getErrorMessage()).toBe("account 'from' has insufficient balance");

    MockVM.setAuthorities([]);

    callerData.caller_privilege = chain.privilege.user_mode;
    MockVM.setCaller(callerData);

    // save the MockVM state because the burn is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      // try to burn tokens
      const koinContract = new Koin();
      const burnArgs = new kcs4.burn_arguments(MOCK_ACCT1, 123);
      koinContract.burn(burnArgs);
    }).toThrow();

    // check error message
    expect(MockVM.getErrorMessage()).toBe("account 'from' has not authorized burn");

    // check balance
    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    // check total supply
    totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(113);
  });

  it("should mint tokens", () => {
    const koinContract = new Koin();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // check total supply
    let totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    koinContract.mint(mintArgs);

    // check events
    const events = MockVM.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].name).toBe('token.mint_event');
    expect(events[0].impacted.length).toBe(1);
    expect(Arrays.equal(events[0].impacted[0], MOCK_ACCT1)).toBe(true);

    const mintEvent = Protobuf.decode<kcs4.mint_event>(events[0].data, kcs4.mint_event.decode);
    expect(Arrays.equal(mintEvent.to, MOCK_ACCT1)).toBe(true);
    expect(mintEvent.value).toBe(123);

    // check balance
    const balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    const balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    // check total supply
    totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);
  });

  it("should not mint tokens if not contract account", () => {
    const koinContract = new Koin();

    // set contract_call authority for MOCK_ACCT1 to true so that we cannot mint tokens
    const auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([auth]);

    // check total supply
    let totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // check balance
    const balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);

    // save the MockVM state because the mint is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      // try to mint tokens
      const koinContract = new Koin();
      const mintArgs = new kcs4.mint_arguments(MOCK_ACCT2, 123);
      koinContract.mint(mintArgs);
    }).toThrow();

    // check balance
    balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);

    // check total supply
    expect(totalSupplyRes.value).toBe(0);
  });

  it("should not mint tokens if new total supply overflows", () => {
    const koinContract = new Koin();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
    MockVM.setAuthorities([auth]);

    let mintArgs = new kcs4.mint_arguments(MOCK_ACCT2, 123);
    koinContract.mint(mintArgs);

    // check total supply
    let totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);

    // save the MockVM state because the mint is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      const koinContract = new Koin();
      const mintArgs = new kcs4.mint_arguments(MOCK_ACCT2, u64.MAX_VALUE);
      koinContract.mint(mintArgs);
    }).toThrow();

    // check total supply
    totalSupplyRes = koinContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);

    // check error message
    expect(MockVM.getErrorMessage()).toBe("mint would overflow supply");
  });

  it("should transfer tokens", () => {
    const koinContract = new Koin();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    // set contract_call authority for MOCK_ACCT1 to true so that we can transfer tokens
    const authMockAcct1 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([authContractId, authMockAcct1]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    koinContract.mint(mintArgs);

    // transfer tokens
    const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10);
    koinContract.transfer(transferArgs);

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT2);
    balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(10);

    // check events
    const events = MockVM.getEvents();
    // 2 events, 1st one is the mint event, the second one is the transfer event
    expect(events.length).toBe(2);
    expect(events[1].name).toBe('token.transfer_event');
    expect(events[1].impacted.length).toBe(2);
    expect(Arrays.equal(events[1].impacted[0], MOCK_ACCT2)).toBe(true);
    expect(Arrays.equal(events[1].impacted[1], MOCK_ACCT1)).toBe(true);

    const transferEvent = Protobuf.decode<kcs4.transfer_event>(events[1].data, kcs4.transfer_event.decode);
    expect(Arrays.equal(transferEvent.from, MOCK_ACCT1)).toBe(true);
    expect(Arrays.equal(transferEvent.to, MOCK_ACCT2)).toBe(true);
    expect(transferEvent.value).toBe(10);
  });

  it("should not transfer tokens without the proper authorizations", () => {
    const koinContract = new Koin();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
    // do not set authority for MOCK_ACCT1
    MockVM.setAuthorities([authContractId]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    koinContract.mint(mintArgs);

    // save the MockVM state because the transfer is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      // try to transfer tokens without the proper authorizations for MOCK_ACCT1
      const koinContract = new Koin();
      const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10);
      koinContract.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT2);
    balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);
  });

  it("should not transfer tokens to self", () => {
    const koinContract = new Koin();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    // set contract_call authority for MOCK_ACCT1 to true so that we can transfer tokens
    const authMockAcct1 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([authContractId, authMockAcct1]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    koinContract.mint(mintArgs);

    // save the MockVM state because the transfer is going to revert the transaction
    MockVM.commitTransaction();

    // try to transfer tokens
    expect(() => {
      const koinContract = new Koin();
      const transferArgs = new kcs4.transfer_arguments(Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG"), MOCK_ACCT1, 10);
      koinContract.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    // check error message
    expect(MockVM.getErrorMessage()).toBe('cannot transfer to yourself');
  });

  it("should not transfer if insufficient balance", () => {
    const koinContract = new Koin();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    // set contract_call authority for MOCK_ACCT1 to true so that we can transfer tokens
    const authMockAcct1 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([authContractId, authMockAcct1]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    koinContract.mint(mintArgs);

    // save the MockVM state because the transfer is going to revert the transaction
    MockVM.commitTransaction();

    // try to transfer tokens
    expect(() => {
      const koinContract = new Koin();
      const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 456);
      koinContract.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    // check error message
    expect(MockVM.getErrorMessage()).toBe("account 'from' has insufficient balance");
  });

  it("should transfer tokens without authority", () => {
    const koinContract = new Koin();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    MockVM.setAuthorities([authContractId]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    koinContract.mint(mintArgs);

    // set caller with MOCK_ACCT1 to allow transfer if the caller is the same from
    MockVM.setCaller(new chain.caller_data(MOCK_ACCT1, chain.privilege.kernel_mode));

    // transfer tokens
    const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10);
    koinContract.transfer(transferArgs);

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT2);
    balanceRes = koinContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(10);

    // check events
    const events = MockVM.getEvents();
    // 2 events, 1st one is the mint event, the second one is the transfer event
    expect(events.length).toBe(2);
    expect(events[1].name).toBe('token.transfer_event');
    expect(events[1].impacted.length).toBe(2);
    expect(Arrays.equal(events[1].impacted[0], MOCK_ACCT2)).toBe(true);
    expect(Arrays.equal(events[1].impacted[1], MOCK_ACCT1)).toBe(true);

    const transferEvent = Protobuf.decode<kcs4.transfer_event>(events[1].data, kcs4.transfer_event.decode);
    expect(Arrays.equal(transferEvent.from, MOCK_ACCT1)).toBe(true);
    expect(Arrays.equal(transferEvent.to, MOCK_ACCT2)).toBe(true);
    expect(transferEvent.value).toBe(10);
  });

  it("should approve", () => {
    const koinContract = new Koin();

    expect(koinContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT2)).value).toBe(0);

    const mockAcc1Auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([mockAcc1Auth]);
    koinContract.approve(new kcs4.approve_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));

    expect(koinContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT2)).value).toBe(10);

    MockVM.setAuthorities([mockAcc1Auth]);
    koinContract.approve(new kcs4.approve_arguments(MOCK_ACCT1, MOCK_ACCT3, 20));

    expect(koinContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT3)).value).toBe(20);

    MockVM.setAuthorities([new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT2, true)]);
    koinContract.approve(new kcs4.approve_arguments(MOCK_ACCT2, MOCK_ACCT3, 30));

    expect(koinContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT2, MOCK_ACCT3)).value).toBe(30);

    // check events
    const events = MockVM.getEvents();
    expect(events.length).toBe(3);
    expect(events[0].name).toBe('token.approve_event');
    expect(events[0].impacted.length).toBe(2);
    expect(Arrays.equal(events[0].impacted[0], MOCK_ACCT1)).toBe(true);
    expect(Arrays.equal(events[0].impacted[1], MOCK_ACCT2)).toBe(true);

    expect(events[1].name).toBe('token.approve_event');
    expect(events[1].impacted.length).toBe(2);
    expect(Arrays.equal(events[1].impacted[0], MOCK_ACCT1)).toBe(true);
    expect(Arrays.equal(events[1].impacted[1], MOCK_ACCT3)).toBe(true);

    expect(events[2].name).toBe('token.approve_event');
    expect(events[2].impacted.length).toBe(2);
    expect(Arrays.equal(events[2].impacted[0], MOCK_ACCT2)).toBe(true);
    expect(Arrays.equal(events[2].impacted[1], MOCK_ACCT3)).toBe(true);

    // Tests basic allowances return
    let allowances = koinContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, new Uint8Array(0), 10));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(2);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances[0].value).toBe(10);
    expect(Arrays.equal(allowances.allowances[1].spender, MOCK_ACCT3)).toBe(true);
    expect(allowances.allowances[1].value).toBe(20);

    // Tests allowances descending
    allowances = koinContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, MOCK_ACCT3, 10, true));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances[0].value).toBe(10);

    // Tests allowances limit
    allowances = koinContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, new Uint8Array(0), 1));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances[0].value).toBe(10);

    // Tests allowances pagination
    allowances = koinContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT3)).toBe(true);
    expect(allowances.allowances[0].value).toBe(20);

    // Tests another owner's allowances
    allowances = koinContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT2, new Uint8Array(0), 10));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT3)).toBe(true);
    expect(allowances.allowances[0].value).toBe(30);
  });

  it("should require an approval", () => {
    const koinContract = new Koin();

    MockVM.setCaller(new chain.caller_data(MOCK_ACCT2, chain.privilege.kernel_mode));
    koinContract.mint(new kcs4.mint_arguments(MOCK_ACCT1, 100));

    MockVM.setCaller(new chain.caller_data(MOCK_ACCT2, chain.privilege.user_mode));

    // should not transfer because allowance does not exist
    expect(() => {
      const koinContract = new Koin();
      koinContract.transfer(new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));
    }).toThrow();

    expect(MockVM.getErrorMessage()).toBe("account 'from' has not authorized transfer");

    // create allowance for 20 tokens
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));
    MockVM.setAuthorities([new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true)]);
    koinContract.approve(new kcs4.approve_arguments(MOCK_ACCT1, MOCK_ACCT2, 20));

    MockVM.setCaller(new chain.caller_data(MOCK_ACCT2, chain.privilege.user_mode));

    // should not transfer because allowance is too small
    expect(() => {
      const koinContract = new Koin();
      koinContract.transfer(new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 25));
    }).toThrow();

    // should transfer partial amount of allowance
    koinContract.transfer(new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));
    expect(koinContract.balance_of(new kcs4.balance_of_arguments(MOCK_ACCT1)).value).toBe(90);
    expect(koinContract.balance_of(new kcs4.balance_of_arguments(MOCK_ACCT2)).value).toBe(10);
    expect(koinContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT2)).value).toBe(10);
  });

  it("should track mana", ()=> {
    const koinContract = new Koin();
    MockVM.setContractName(MOCK_ACCT3, "governance");
    MockVM.setContractAddress("governance", MOCK_ACCT3);

    const getRcArgs = new system_calls.get_account_rc_arguments(MOCK_ACCT1);
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(0);

    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));
    koinContract.mint(new kcs4.mint_arguments(MOCK_ACCT1, 1000000));
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(1000000);

    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.user_mode));
    koinContract.consume_account_rc(new system_calls.consume_account_rc_arguments(MOCK_ACCT1, 800000));
    let logs = MockVM.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toBe("The system call 'consume_account_rc' must be called from kernel context");
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(1000000);

    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));
    koinContract.consume_account_rc(new system_calls.consume_account_rc_arguments(MOCK_ACCT1, 800000));
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(200000);

    // Regen in 1 day should be +200,000
    MockVM.setHeadInfo(new chain.head_info(null, 86400 * 1000, 1));
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(400000);

    // Regen in 4 days should be +800,000
    MockVM.setHeadInfo(new chain.head_info(null, 4 * 86400 * 1000, 1));
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(1000000);

    // Regen in 10 days should be +800,000
    MockVM.setHeadInfo(new chain.head_info(null, 10 * 86400 * 1000, 1));
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(1000000);
  });

  it("should not allow consuming too much mana", ()=> {
    const koinContract = new Koin();
    MockVM.setContractName(MOCK_ACCT3, "governance");
    MockVM.setContractAddress("governance", MOCK_ACCT3);

    const getRcArgs = new system_calls.get_account_rc_arguments(MOCK_ACCT1);
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(0);

    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));
    koinContract.mint(new kcs4.mint_arguments(MOCK_ACCT1, 1000000));
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(1000000);

    expect(koinContract.consume_account_rc(new system_calls.consume_account_rc_arguments(MOCK_ACCT1, 800000)).value).toBe(true);
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(200000);

    expect(koinContract.consume_account_rc(new system_calls.consume_account_rc_arguments(MOCK_ACCT1, 800000)).value).toBe(false);
    expect(koinContract.get_account_rc(getRcArgs).value).toBe(200000);
  });

  it("should handle governance mana", ()=> {
    const koinContract = new Koin();
    MockVM.setContractName(MOCK_ACCT3, "governance");
    MockVM.setContractAddress("governance", MOCK_ACCT3);

    // Check governance mana
    expect(koinContract.get_account_rc(new system_calls.get_account_rc_arguments(MOCK_ACCT3)).value).toBe(u64.MAX_VALUE);
  });

  it("should handle mana regen overflow", ()=> {
    const koinContract = new Koin();
    MockVM.setContractName(MOCK_ACCT3, "governance");
    MockVM.setContractAddress("governance", MOCK_ACCT3);

    // Balance will be set to a value that will guarantee 64 bit overflow when regenerating mana.
    const balance = (u64.MAX_VALUE / (5 * 86400 * 1000)) + 1;
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));
    koinContract.mint(new kcs4.mint_arguments(MOCK_ACCT1, (u64.MAX_VALUE / (5 * 86400 * 1000)) + 1));

    koinContract.consume_account_rc(new system_calls.consume_account_rc_arguments(MOCK_ACCT1, balance));
    expect(koinContract.get_account_rc(new system_calls.get_account_rc_arguments(MOCK_ACCT1)).value).toBe(0);
    expect(koinContract.balance_of(new kcs4.balance_of_arguments(MOCK_ACCT1)).value).toBe(balance);

    MockVM.setHeadInfo(new chain.head_info(null, 5 * 86400 * 1000, 1));
    expect(koinContract.get_account_rc(new system_calls.get_account_rc_arguments(MOCK_ACCT1)).value).toBe(balance);
    expect(koinContract.balance_of(new kcs4.balance_of_arguments(MOCK_ACCT1)).value).toBe(balance);
  });
});
