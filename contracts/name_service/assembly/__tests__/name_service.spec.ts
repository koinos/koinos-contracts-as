import { Base58, MockVM, authority, Arrays, Protobuf, chain, protocol, name_service } from "@koinos/sdk-as";
import { NameService } from "../NameService";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");

const MOCK_ACCT1 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG");
const MOCK_ACCT2 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqK");

const MOCK_NAME1 = "test1";
const MOCK_NAME2 = "test2";

let headBlock = new protocol.block();

describe("name_service", () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
    MockVM.setCaller(new chain.caller_data(new Uint8Array(0), chain.privilege.kernel_mode));

    headBlock.header = new protocol.block_header();
    headBlock.header!.height = 10;

    MockVM.setBlock(headBlock);
  });

  it("should ensure basic mapping", () => {
    MockVM.setSystemAuthority(true);

    const ns = new NameService();

    // set some records
    ns.set_record(new name_service.set_record_arguments(MOCK_NAME1, MOCK_ACCT1));
    ns.set_record(new name_service.set_record_arguments(MOCK_NAME2, MOCK_ACCT2));

    MockVM.setCaller(new chain.caller_data(MOCK_ACCT1, chain.privilege.user_mode));

    // check the records
    check_mapping(ns, MOCK_NAME1, MOCK_ACCT1);
    check_mapping(ns, MOCK_NAME2, MOCK_ACCT2);
  });
});

function check_mapping(ns:NameService, expected_name:string, expected_address:Uint8Array): void {
    const a_record = ns.get_address(new name_service.get_address_arguments(expected_name));
    expect(Arrays.equal(a_record.value!.address, expected_address)).toBe(true);

    const n_record = ns.get_name(new name_service.get_name_arguments(expected_address));
    expect(n_record.value!.name).toBe(expected_name);
}
