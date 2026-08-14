import { System, Protobuf, authority } from "@koinos/sdk-as";
import { Bytestorage as ContractClass } from "./Bytestorage";
import { bytestorage } from "./proto/bytestorage";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    // get_bytecode
    case 0xb61ca37c: {
      const args = Protobuf.decode<bytestorage.get_bytecode_arguments>(
        contractArgs.args,
        bytestorage.get_bytecode_arguments.decode
      );
      const res = c.get_bytecode(args);
      retbuf = Protobuf.encode(
        res,
        bytestorage.bytecode.encode
      );
      break;
    }

    // save_bytecode
    case 0xbc0ea29c: {
      const args = Protobuf.decode<bytestorage.bytecode>(
        contractArgs.args,
        bytestorage.bytecode.decode
      );
      c.save_bytecode(args);
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
