import { Base58, MockVM, authority, Arrays, Protobuf, System, chain, kcs4, protocol } from "@koinos/sdk-as";
import { vhp } from "../proto/vhp";
import { Vhp } from "../Vhp";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");

const MOCK_ACCT1 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG");
const MOCK_ACCT2 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqK");
const MOCK_ACCT3 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqP");

const headBlock = new protocol.block(new Uint8Array(0), new protocol.block_header(new Uint8Array(0), 10));

describe("vhp", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
    MockVM.setContractArguments(CONTRACT_ID); // Dummy value
    MockVM.setEntryPoint(0);
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.user_mode));
    MockVM.setBlock(headBlock);
    MockVM.setContractMetadata(new chain.contract_metadata_object(new Uint8Array(0), false, false, false, false));

    System.resetCache();
  });

  it("should get the name", () => {
    const vhpContract = new Vhp();
    const res = vhpContract.name();
    expect(res.value).toBe("Virtual Hash Power");
  });

  it("should get the symbol", () => {
    const vhpContract = new Vhp();
    const res = vhpContract.symbol();
    expect(res.value).toBe("VHP");
  });

  it("should get the decimals", () => {
    const vhpContract = new Vhp();
    const res = vhpContract.decimals();
    expect(res.value).toBe(8);
  });

  it("should get token info", () => {
    const vhpContract = new Vhp();
    const res = vhpContract.get_info();
    expect(res.name).toBe("Virtual Hash Power");
    expect(res.symbol).toBe("VHP");
    expect(res.decimals).toBe(8);
  });

  it("should/not burn tokens", () => {
    const vhpContract = new Vhp();
    let callerData = new chain.caller_data();
    callerData.caller = CONTRACT_ID;
    callerData.caller_privilege = chain.privilege.kernel_mode;
    MockVM.setCaller(callerData);

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    let auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
    MockVM.setAuthorities([auth]);

    // check total supply
    let totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    vhpContract.mint(mintArgs);

    totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);

    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([auth]);

    // burn tokens
    vhpContract.burn(new kcs4.burn_arguments(MOCK_ACCT1, 10));

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
    balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    // check total supply
    totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(113);

    // save the MockVM state because the burn is going to revert the transaction
    MockVM.commitTransaction();

    // does not burn tokens
    expect(() => {
      const vhpContract = new Vhp();
      const burnArgs = new kcs4.burn_arguments(MOCK_ACCT1, 200);
      vhpContract.burn(burnArgs);
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
      const vhpContract = new Vhp();
      const burnArgs = new kcs4.burn_arguments(MOCK_ACCT1, 123);
      vhpContract.burn(burnArgs);
    }).toThrow();

    // check error message
    expect(MockVM.getErrorMessage()).toBe("account 'from' has not authorized burn");

    // check balance
    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    // check total supply
    totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(113);
  });

  it("should mint tokens", () => {
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
    MockVM.setAuthorities([auth]);

    // check total supply
    let totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    vhpContract.mint(mintArgs);

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
    const balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    // check total supply
    totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);
  });

  it("should not mint tokens if not contract account", () => {
    const vhpContract = new Vhp();

    // set contract_call authority for MOCK_ACCT1 to true so that we cannot mint tokens
    const auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([auth]);

    // check total supply
    let totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(0);

    // check balance
    const balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);

    // save the MockVM state because the mint is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      // try to mint tokens
      const vhpContract = new Vhp();
      const mintArgs = new kcs4.mint_arguments(MOCK_ACCT2, 123);
      vhpContract.mint(mintArgs);
    }).toThrow();

    // check balance
    balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);

    // check total supply
    expect(totalSupplyRes.value).toBe(0);
  });

  it("should not mint tokens if new total supply overflows", () => {
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
    MockVM.setAuthorities([auth]);

    let mintArgs = new kcs4.mint_arguments(MOCK_ACCT2, 123);
    vhpContract.mint(mintArgs);

    // check total supply
    let totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);

    // save the MockVM state because the mint is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      const vhpContract = new Vhp();
      const mintArgs = new kcs4.mint_arguments(MOCK_ACCT2, u64.MAX_VALUE);
      vhpContract.mint(mintArgs);
    }).toThrow();

    // check total supply
    totalSupplyRes = vhpContract.total_supply();
    expect(totalSupplyRes.value).toBe(123);

    // check error message
    expect(MockVM.getErrorMessage()).toBe("mint would overflow supply");
  });

  it("should transfer tokens", () => {
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    // set contract_call authority for MOCK_ACCT1 to true so that we can transfer tokens
    const authMockAcct1 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([authContractId, authMockAcct1]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    vhpContract.mint(mintArgs);

    // transfer tokens
    const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10);
    vhpContract.transfer(transferArgs);

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT2);
    balanceRes = vhpContract.balance_of(balanceArgs);
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
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
    // do not set authority for MOCK_ACCT1
    MockVM.setAuthorities([authContractId]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    vhpContract.mint(mintArgs);

    // save the MockVM state because the transfer is going to revert the transaction
    MockVM.commitTransaction();

    expect(() => {
      // try to transfer tokens without the proper authorizations for MOCK_ACCT1
      const vhpContract = new Vhp();
      const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10);
      vhpContract.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT2);
    balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(0);
  });

  it("should not transfer tokens to self", () => {
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    // set contract_call authority for MOCK_ACCT1 to true so that we can transfer tokens
    const authMockAcct1 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([authContractId, authMockAcct1]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    vhpContract.mint(mintArgs);

    // save the MockVM state because the transfer is going to revert the transaction
    MockVM.commitTransaction();

    // try to transfer tokens
    expect(() => {
      const vhpContract = new Vhp();
      const transferArgs = new kcs4.transfer_arguments(Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG"), MOCK_ACCT1, 10);
      vhpContract.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    // check error message
    expect(MockVM.getErrorMessage()).toBe('cannot transfer to yourself');
  });

  it("should not transfer if insufficient balance", () => {
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    // set contract_call authority for MOCK_ACCT1 to true so that we can transfer tokens
    const authMockAcct1 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([authContractId, authMockAcct1]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    vhpContract.mint(mintArgs);

    // save the MockVM state because the transfer is going to revert the transaction
    MockVM.commitTransaction();

    // try to transfer tokens
    expect(() => {
      const vhpContract = new Vhp();
      const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 456);
      vhpContract.transfer(transferArgs);
    }).toThrow();

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(123);

    // check error message
    expect(MockVM.getErrorMessage()).toBe("account 'from' has insufficient balance");
  });

  it("should delay effective balance", () => {
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    // set contract_call authority for MOCK_ACCT1 to true so that we can transfer tokens
    const authMockAcct1 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    const authMockAcct2 = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT2, true);

    MockVM.setAuthorities([authContractId]);

    const effectiveBalanceMockAcct1 = new vhp.effective_balance_of_arguments(MOCK_ACCT1);
    const effectiveBalanceMockAcct2 = new vhp.effective_balance_of_arguments(MOCK_ACCT2);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(0);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 100);
    vhpContract.mint(mintArgs);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(0);

    headBlock.header!.height = 29;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(0);

    headBlock.header!.height = 30;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(100);

    const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 1);
    MockVM.setAuthorities([authMockAcct1, authMockAcct1, authMockAcct1, authMockAcct1]);

    vhpContract.transfer(transferArgs);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(99);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);

    vhpContract.transfer(transferArgs);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(98);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);

    headBlock.header!.height = 31;
    MockVM.setBlock(headBlock);

    vhpContract.transfer(transferArgs);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(97);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);

    headBlock.header!.height = 35;
    MockVM.setBlock(headBlock);

    vhpContract.transfer(transferArgs);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(96);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);

    headBlock.header!.height = 49;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(96);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);

    headBlock.header!.height = 50;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(96);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(2);

    headBlock.header!.height = 51;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(96);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(3);

    headBlock.header!.height = 54;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(96);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(3);

    headBlock.header!.height = 55;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(96);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(4);

    MockVM.setAuthorities([authMockAcct1, authMockAcct2]);

    vhpContract.transfer(transferArgs);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(95);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(4);

    headBlock.header!.height = 56;
    MockVM.setBlock(headBlock);

    transferArgs.from = MOCK_ACCT2;
    transferArgs.to = MOCK_ACCT1;
    transferArgs.value = 4;

    vhpContract.transfer(transferArgs);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(95);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);

    headBlock.header!.height = 74;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(95);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);

    headBlock.header!.height = 75;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(95);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(1);

    headBlock.header!.height = 76;
    MockVM.setBlock(headBlock);

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct1).value).toBe(99);
    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(1);

    MockVM.setAuthorities([authMockAcct2]);
    vhpContract.burn(new kcs4.burn_arguments(MOCK_ACCT2, 1));

    expect(vhpContract.effective_balance_of(effectiveBalanceMockAcct2).value).toBe(0);
  });

  it("should transfer tokens without authority", () => {
    const vhpContract = new Vhp();

    // set kernel mode
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
    const authContractId = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);

    MockVM.setAuthorities([authContractId]);

    // mint tokens
    const mintArgs = new kcs4.mint_arguments(MOCK_ACCT1, 123);
    vhpContract.mint(mintArgs);

    // set caller with MOCK_ACCT1 to allow transfer if the caller is the same from
    MockVM.setCaller(new chain.caller_data(MOCK_ACCT1, chain.privilege.kernel_mode));

    // transfer tokens
    const transferArgs = new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10);
    vhpContract.transfer(transferArgs);

    // check balances
    let balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT1);
    let balanceRes = vhpContract.balance_of(balanceArgs);
    expect(balanceRes.value).toBe(113);

    balanceArgs = new kcs4.balance_of_arguments(MOCK_ACCT2);
    balanceRes = vhpContract.balance_of(balanceArgs);
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
    const vhpContract = new Vhp();

    expect(vhpContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT2)).value).toBe(0);

    const mockAcc1Auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true);
    MockVM.setAuthorities([mockAcc1Auth]);
    vhpContract.approve(new kcs4.approve_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));

    expect(vhpContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT2)).value).toBe(10);

    MockVM.setAuthorities([mockAcc1Auth]);
    vhpContract.approve(new kcs4.approve_arguments(MOCK_ACCT1, MOCK_ACCT3, 20));

    expect(vhpContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT3)).value).toBe(20);

    MockVM.setAuthorities([new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT2, true)]);
    vhpContract.approve(new kcs4.approve_arguments(MOCK_ACCT2, MOCK_ACCT3, 30));

    expect(vhpContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT2, MOCK_ACCT3)).value).toBe(30);

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
    let allowances = vhpContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, new Uint8Array(0), 10));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(2);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances[0].value).toBe(10);
    expect(Arrays.equal(allowances.allowances[1].spender, MOCK_ACCT3)).toBe(true);
    expect(allowances.allowances[1].value).toBe(20);

    // Tests allowances descending
    allowances = vhpContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, MOCK_ACCT3, 10, true));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances[0].value).toBe(10);

    // Tests allowances limit
    allowances = vhpContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, new Uint8Array(0), 1));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances[0].value).toBe(10);

    // Tests allowances pagination
    allowances = vhpContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT1)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT3)).toBe(true);
    expect(allowances.allowances[0].value).toBe(20);

    // Tests another owner's allowances
    allowances = vhpContract.get_allowances(new kcs4.get_allowances_arguments(MOCK_ACCT2, new Uint8Array(0), 10));
    expect(Arrays.equal(allowances.owner, MOCK_ACCT2)).toBe(true);
    expect(allowances.allowances.length).toBe(1);
    expect(Arrays.equal(allowances.allowances[0].spender, MOCK_ACCT3)).toBe(true);
    expect(allowances.allowances[0].value).toBe(30);
  });

  it("should require an approval", () => {
    const vhpContract = new Vhp();

    MockVM.setCaller(new chain.caller_data(MOCK_ACCT2, chain.privilege.kernel_mode));
    vhpContract.mint(new kcs4.mint_arguments(MOCK_ACCT1, 100));

    MockVM.setCaller(new chain.caller_data(MOCK_ACCT2, chain.privilege.user_mode));

    // should not transfer because allowance does not exist
    expect(() => {
      const vhpContract = new Vhp();
      vhpContract.transfer(new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));
    }).toThrow();

    expect(MockVM.getErrorMessage()).toBe("account 'from' has not authorized transfer");

    // create allowance for 20 tokens
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));
    MockVM.setAuthorities([new MockVM.MockAuthority(authority.authorization_type.contract_call, MOCK_ACCT1, true)]);
    vhpContract.approve(new kcs4.approve_arguments(MOCK_ACCT1, MOCK_ACCT2, 20));

    MockVM.setCaller(new chain.caller_data(MOCK_ACCT2, chain.privilege.user_mode));

    // should not transfer because allowance is too small
    expect(() => {
      const vhpContract = new Vhp();
      vhpContract.transfer(new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 25));
    }).toThrow();

    // should transfer partial amount of allowance
    vhpContract.transfer(new kcs4.transfer_arguments(MOCK_ACCT1, MOCK_ACCT2, 10));
    expect(vhpContract.balance_of(new kcs4.balance_of_arguments(MOCK_ACCT1)).value).toBe(90);
    expect(vhpContract.balance_of(new kcs4.balance_of_arguments(MOCK_ACCT2)).value).toBe(10);
    expect(vhpContract.allowance(new kcs4.allowance_arguments(MOCK_ACCT1, MOCK_ACCT2)).value).toBe(10);
  });
});
