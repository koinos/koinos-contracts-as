import { System, Protobuf, authority } from "@koinos/sdk-as";
import { Fund as ContractClass } from "./Fund";
import { fund } from "./proto/fund";

export function main(): i32 {
  const contractArgs = System.getArguments();
  let retbuf = new Uint8Array(1024);

  const c = new ContractClass();

  switch (contractArgs.entry_point) {
    // set_global_vars
    case 0x3e9e4af0: {
      const args = Protobuf.decode<fund.set_global_vars_arguments>(
        contractArgs.args,
        fund.set_global_vars_arguments.decode
      );
      c.set_global_vars(args);
      retbuf = new Uint8Array(0);
      break;
    }

    // get_global_vars
    case 0x2e4369d4: {
      const res = c.get_global_vars();
      retbuf = Protobuf.encode(
        res,
        fund.global_vars.encode
      );
      break;
    }

    // get_project
    case 0xd0572e06: {
      const args = Protobuf.decode<fund.get_project_arguments>(
        contractArgs.args,
        fund.get_project_arguments.decode
      );
      const res = c.get_project(args);
      retbuf = Protobuf.encode(
        res,
        fund.project.encode
      );
      break;
    }

    // get_projects
    case 0x5c0cce37: {
      const args = Protobuf.decode<fund.get_projects_arguments>(
        contractArgs.args,
        fund.get_projects_arguments.decode
      );
      const res = c.get_projects(args);
      retbuf = Protobuf.encode(
        res,
        fund.get_projects_result.encode
      );
      break;
    }

    // get_user_votes
    case 0x66f631d7: {
      const args = Protobuf.decode<fund.get_user_votes_arguments>(
        contractArgs.args,
        fund.get_user_votes_arguments.decode
      );
      const res = c.get_user_votes(args);
      retbuf = Protobuf.encode(
        res,
        fund.get_user_votes_result.encode
      );
      break;
    }

    // submit_project
    case 0x3baabbbd: {
      const args = Protobuf.decode<fund.submit_project_arguments>(
        contractArgs.args,
        fund.submit_project_arguments.decode
      );
      const res = c.submit_project(args);
      retbuf = Protobuf.encode(
        res,
        fund.submit_project_result.encode
      );
      break;
    }

    // update_vote
    case 0xcb0bea9e: {
      const args = Protobuf.decode<fund.update_vote_arguments>(
        contractArgs.args,
        fund.update_vote_arguments.decode
      );
      const res = c.update_vote(args);
      retbuf = Protobuf.encode(
        res,
        fund.update_vote_result.encode
      );
      break;
    }

    // update_votes
    case 0x8ad742c2: {
      const args = Protobuf.decode<fund.update_votes_arguments>(
        contractArgs.args,
        fund.update_votes_arguments.decode
      );
      c.update_votes(args);
      retbuf = new Uint8Array(0);
      break;
    }

    // pay_projects
    case 0xffee4af6: {
      const res = c.pay_projects();
      retbuf = Protobuf.encode(
        res,
        fund.pay_projects_result.encode
      );
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
