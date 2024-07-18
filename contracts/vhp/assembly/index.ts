import { System, Protobuf, authority, kcs4} from "@koinos/sdk-as";
import { vhp } from "./proto/vhp";
import { Vhp as ContractClass } from "./Vhp";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    case 0x82a3537f: {
      const res = c.name();
      retbuf = Protobuf.encode(
        res,
        kcs4.name_result.encode
      );
      break;
    }

    case 0xb76a7ca1: {
      const res = c.symbol();
      retbuf = Protobuf.encode(
        res,
        kcs4.symbol_result.encode
      );
      break;
    }

    case 0xee80fd2f: {
      const res = c.decimals();
      retbuf = Protobuf.encode(
        res,
        kcs4.decimals_result.encode
      );
      break;
    }

    case 0xb0da3934: {
      const res = c.total_supply();
      retbuf = Protobuf.encode(res, kcs4.total_supply_result.encode);
      break;
    }
    case 0x5c721497: {
      const args = Protobuf.decode<kcs4.balance_of_arguments>(
        contractArgs.args,
        kcs4.balance_of_arguments.decode
      );
      const res = c.balance_of(args);
      retbuf = Protobuf.encode(
        res,
        kcs4.balance_of_result.encode
      );
      break;
    }
    case 0x629f31e6: {
      const args = Protobuf.decode<vhp.effective_balance_of_arguments>(
        contractArgs.args,
        vhp.effective_balance_of_arguments.decode
      );
      const res = c.effective_balance_of(args);
      retbuf = Protobuf.encode(
        res,
        vhp.effective_balance_of_result.encode
      );
      break;
    }
    case 0x27f576ca: {
      const args = Protobuf.decode<kcs4.transfer_arguments>(
        contractArgs.args,
        kcs4.transfer_arguments.decode
      );
      const res = c.transfer(args);
      retbuf = Protobuf.encode(
        res,
        kcs4.transfer_result.encode
      );
      break;
    }
    case 0xdc6f17bb: {
      const args = Protobuf.decode<kcs4.mint_arguments>(
        contractArgs.args,
        kcs4.mint_arguments.decode
      );
      const res = c.mint(args);
      retbuf = Protobuf.encode(
        res,
        kcs4.mint_result.encode
      );
      break;
    }
    case 0x859facc5: {
      const args = Protobuf.decode<kcs4.burn_arguments>(
        contractArgs.args,
        kcs4.burn_arguments.decode
      );
      const res = c.burn(args);
      retbuf = Protobuf.encode(
        res,
        kcs4.burn_result.encode
      );
      break;
    }
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
