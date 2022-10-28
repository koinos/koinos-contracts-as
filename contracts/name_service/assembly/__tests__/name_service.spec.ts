import { Base58, MockVM, token, authority, Arrays, Protobuf, chain, protocol, name_service } from "@koinos/sdk-as";
import { NameService } from "../NameService";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");

const MOCK_ACCT1 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG");
const MOCK_ACCT2 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqK");

const MOCK_NAME1 = "test1";
const MOCK_NAME2 = "test2";

let headBlock = new protocol.block();

describe("name_service", () => {
    /*beforeEach(() => {
        MockVM.reset();
        MockVM.setContractId(CONTRACT_ID);
        MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));
    
        headBlock.header = new protocol.block_header();
        headBlock.header!.height = 10;
    
        MockVM.setBlock(headBlock);
      });*/

      it("should ensure basic mapping", () => {
        MockVM.reset();
        MockVM.setContractId(CONTRACT_ID);
        const auth = new MockVM.MockAuthority(authority.authorization_type.contract_call, CONTRACT_ID, true);
        MockVM.setAuthorities([auth]);
    
        const ns = new NameService();

        // set some records
        ns.set_record(new name_service.set_record_arguments(MOCK_NAME1, MOCK_ACCT1));
        ns.set_record(new name_service.set_record_arguments(MOCK_NAME2, MOCK_ACCT2));

        MockVM.setCaller(new chain.caller_data(MOCK_ACCT1, chain.privilege.user_mode));

        // check the records
        check_mapping(ns, MOCK_NAME1, MOCK_ACCT1);
        check_mapping(ns, MOCK_NAME2, MOCK_ACCT2);
    
        /*
        // set contract_call authority for CONTRACT_ID to true so that we can mint tokens
        
        // check total supply
        const totalSupplyArgs = new token.total_supply_arguments();
        let totalSupplyRes = tkn.total_supply(totalSupplyArgs);
        expect(totalSupplyRes.value).toBe(0);
    
        // mint tokens
        const mintArgs = new token.mint_arguments(MOCK_ACCT1, 123);
        tkn.mint(mintArgs);
    
        // check events
        const events = MockVM.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].name).toBe('koinos.contracts.token.mint_event'); 
        expect(events[0].impacted.length).toBe(1);
        expect(Arrays.equal(events[0].impacted[0], MOCK_ACCT1)).toBe(true);
    
        const mintEvent = Protobuf.decode<token.mint_event>(events[0].data!, token.mint_event.decode);
        expect(Arrays.equal(mintEvent.to, MOCK_ACCT1)).toBe(true);
        expect(mintEvent.value).toBe(123);
    
        // check balance
        const balanceArgs = new token.balance_of_arguments(MOCK_ACCT1);
        const balanceRes = tkn.balance_of(balanceArgs);
        expect(balanceRes.value).toBe(123);
    
        // check total supply
        totalSupplyRes = tkn.total_supply(totalSupplyArgs);
        expect(totalSupplyRes.value).toBe(123);*/
      });
});

function check_mapping(ns:NameService, expected_name:string, expected_address:Uint8Array): void {
    const a_record = ns.get_address(new name_service.get_address_arguments(expected_name));
    expect(Arrays.equal(a_record.value!.address, expected_address)).toBe(true);

    const n_record = ns.get_name(new name_service.get_name_arguments(expected_address));
    expect(n_record.value!.name).toBe(expected_name);
}