import { System, Protobuf, name_service } from "@koinos/sdk-as";
import { NameService as ContractClass } from "./NameService";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    case 0xe248c73a: {
      const args = Protobuf.decode<name_service.set_record_arguments>(
        contractArgs.args,
        name_service.set_record_arguments.decode
      );
      const res = c.set_record(args);
      retbuf = Protobuf.encode(
        res,
        name_service.set_record_result.encode
      );
      break;
    }

  case 0xe5070a16: {
    const args = Protobuf.decode<name_service.get_name_arguments>(
      contractArgs.args,
      name_service.get_name_arguments.decode
    );
    const res = c.get_name(args);
    retbuf = Protobuf.encode(
      res,
      name_service.get_name_result.encode
    );
    break;
  }

  case 0xa61ae5e8: {
    const args = Protobuf.decode<name_service.get_address_arguments>(
      contractArgs.args,
      name_service.get_address_arguments.decode
    );
    const res = c.get_address(args);
    retbuf = Protobuf.encode(
      res,
      name_service.get_address_result.encode
    );
    break;
  }

  default:
    System.exit(1);
    break;
}

  System.exit(0, retbuf);
  return 0;
}

main();
