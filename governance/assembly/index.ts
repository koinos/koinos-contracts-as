import { System, Protobuf, authority, system_calls } from "koinos-sdk-as";
import { Governance as ContractClass } from "./Governance";
import { governance as ProtoNamespace } from "./proto/governance";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    case 0xe74b785c: {
      const args = Protobuf.decode<ProtoNamespace.submit_proposal_arguments>(
        contractArgs.args,
        ProtoNamespace.submit_proposal_arguments.decode
      );
      const res = c.submit_proposal(args);
      retbuf = Protobuf.encode(
        res,
        ProtoNamespace.submit_proposal_result.encode
      );
      break;
    }

    case 0xc66013ad: {
      const args = Protobuf.decode<ProtoNamespace.get_proposal_by_id_arguments>(
        contractArgs.args,
        ProtoNamespace.get_proposal_by_id_arguments.decode
      );
      const res = c.get_proposal_by_id(args);
      retbuf = Protobuf.encode(
        res,
        ProtoNamespace.get_proposal_by_id_result.encode
      );
      break;
    }

    case 0x66206f76: {
      const args =
        Protobuf.decode<ProtoNamespace.get_proposals_by_status_arguments>(
          contractArgs.args,
          ProtoNamespace.get_proposals_by_status_arguments.decode
        );
      const res = c.get_proposals_by_status(args);
      retbuf = Protobuf.encode(
        res,
        ProtoNamespace.get_proposals_by_status_result.encode
      );
      break;
    }

    case 0xd44caa11: {
      const args = Protobuf.decode<ProtoNamespace.get_proposals_arguments>(
        contractArgs.args,
        ProtoNamespace.get_proposals_arguments.decode
      );
      const res = c.get_proposals(args);
      retbuf = Protobuf.encode(res, ProtoNamespace.get_proposals_result.encode);
      break;
    }

    case 0x531d5d4e: {
      const args = Protobuf.decode<ProtoNamespace.block_callback_arguments>(
        contractArgs.args,
        ProtoNamespace.block_callback_arguments.decode
      );
      const res = c.block_callback(args);
      retbuf = Protobuf.encode(
        res,
        ProtoNamespace.block_callback_result.encode
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
      );
      break;
    }

    case 0x279b51fa: {
      const args = Protobuf.decode<system_calls.check_system_authority_arguments>(
        contractArgs.args,
        system_calls.check_system_authority_arguments.decode
      );
      const res = c.require_system_authority(args)
      retbuf = Protobuf.encode(
        res,
        system_calls.check_system_authority_result.encode
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
