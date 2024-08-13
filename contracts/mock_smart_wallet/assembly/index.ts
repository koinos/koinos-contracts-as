import { System, Protobuf, authority} from "@koinos/sdk-as";
import { mock_smart_wallet as mock } from "./proto/mock_smart_wallet";
import { MockSmartWallet as ContractClass } from "./MockSmartWallet";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {

    case 0x61af7061: {
      const args = Protobuf.decode<mock.set_authorization_arguments>(
        contractArgs.args,
        mock.set_authorization_arguments.decode
      );
      const res = c.set_authorization(args);
      retbuf = Protobuf.encode(
        res,
        mock.set_authorization_result.encode
      );
      break;
    }

    case : {
      const args = Protobuf.decode<mock.clear_authorization_arguments>(
        contractArgs.args,
        mock.clear_authorization_arguments.decode
      );
      const res = c.clear_authorization(args);
      retbuf = Protobuf.encode(
        res,
        mock.clear_authorization_result.encode
      );
      break;
    }

    case 0x4a2dbd90: {
      const args = Protobuf.decode<authority.authorize_arguments>(
        contractArgs.args,
        authority.authorize_arguments.decode
      );
      const res = c.authorize(args);
      retbuf = Protobuf.encode(
        res,
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
