import { System, Protobuf, authority } from "@koinos/sdk-as";
import { Getcontractmetadata as ContractClass } from "./Getcontractmetadata";
import { getcontractmetadata as ProtoNamespace } from "./proto/getcontractmetadata";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    case 0x784faa08: {
      const args =
        Protobuf.decode<ProtoNamespace.get_contract_metadata_arguments>(
          contractArgs.args,
          ProtoNamespace.get_contract_metadata_arguments.decode
        );
      const res = c.get_contract_metadata(args);
      retbuf = Protobuf.encode(
        res,
        ProtoNamespace.get_contract_metadata_result.encode
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
