import { System, Protobuf, authority } from "@koinos/sdk-as";
import { Bytelauncher as ContractClass } from "./Bytelauncher";
import { bytelauncher } from "./proto/bytelauncher";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    // upload_contract
    case 0x877511dd: {
      const args = Protobuf.decode<bytelauncher.upload_contract_arguments>(
        contractArgs.args,
        bytelauncher.upload_contract_arguments.decode
      );
      c.upload_contract(args);
      retbuf = new Uint8Array(0);
      break;
    }

    // authorize
    case 0x4a2dbd90: {
      retbuf = Protobuf.encode(
        new authority.authorize_result(System.checkSystemAuthority()),
        authority.authorize_result.encode
      )
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
