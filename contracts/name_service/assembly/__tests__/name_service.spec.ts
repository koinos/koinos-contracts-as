import { Base58, MockVM, authority, Arrays, Protobuf, chain, protocol, name_service } from "@koinos/sdk-as";
import { NameService } from "../NameService";

const CONTRACT_ID = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqe");

const MOCK_ACCT1 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqG");
const MOCK_ACCT2 = Base58.decode("1DQzuCcTKacbs9GGScRTU1Hc8BsyARTPqK");
const MOCK_ACCT3 = Base58.decode("1Fv9wJ69oNchdrdWMzYWU12hTfZSCpXZgy");

const MOCK_NAME1 = "test1";
const MOCK_NAME2 = "test2";
const MOCK_NAME3 = "test3";

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
    const ns = new NameService();

    MockVM.setSystemAuthority(true);

    // set some records
    ns.set_record(new name_service.set_record_arguments(MOCK_NAME1, MOCK_ACCT1));
    ns.set_record(new name_service.set_record_arguments(MOCK_NAME2, MOCK_ACCT2));

    // check the records
    check_mapping(ns, MOCK_NAME1, MOCK_ACCT1);
    check_mapping(ns, MOCK_NAME2, MOCK_ACCT2);

    // Update the record to a new address
    ns.set_record(new name_service.set_record_arguments(MOCK_NAME1, MOCK_ACCT3));

    // check the records
    check_mapping(ns, MOCK_NAME1, MOCK_ACCT3);
    check_mapping(ns, MOCK_NAME2, MOCK_ACCT2);

    // check throw on getting old record
    expect(() => {
      const ns = new NameService();
      ns.get_name(new name_service.get_name_arguments(MOCK_ACCT1));
    }).toThrow();

    // Update the record to a new name

    ns.set_record(new name_service.set_record_arguments(MOCK_NAME3, MOCK_ACCT3));

    // check the records
    check_mapping(ns, MOCK_NAME3, MOCK_ACCT3);
    check_mapping(ns, MOCK_NAME2, MOCK_ACCT2);

    // check throw on getting old record
    expect(() => {
      const ns = new NameService();
      ns.get_address(new name_service.get_address_arguments(MOCK_NAME1));
    }).toThrow();

    // check throw when setting without system authority
    MockVM.setSystemAuthority(false);

    expect(() => {
      const ns = new NameService();
      ns.set_record(new name_service.set_record_arguments(MOCK_NAME1, MOCK_ACCT1));
    }).toThrow();

    // check the records
    check_mapping(ns, MOCK_NAME3, MOCK_ACCT3);
    check_mapping(ns, MOCK_NAME2, MOCK_ACCT2);

    MockVM.setSystemAuthority(false);

    // check failure on null arguments
    expect(() => {
      const ns = new NameService();
      ns.set_record(new name_service.set_record_arguments(null, MOCK_ACCT1));
    }).toThrow();

    expect(() => {
      const ns = new NameService();
      ns.set_record(new name_service.set_record_arguments(MOCK_NAME1, null));
    }).toThrow();

    expect(() => {
      const ns = new NameService();
      ns.get_address(new name_service.get_address_arguments(null));
    }).toThrow();

    expect(() => {
      const ns = new NameService();
      ns.get_name(new name_service.get_name_arguments(null));
    }).toThrow();
  });
});

function check_mapping(ns:NameService, expected_name:string, expected_address:Uint8Array): void {
  const a_record = ns.get_address(new name_service.get_address_arguments(expected_name));
  expect(Arrays.equal(a_record.value!.address, expected_address)).toBe(true);

  const n_record = ns.get_name(new name_service.get_name_arguments(expected_address));
  expect(n_record.value!.name).toBe(expected_name);
}
