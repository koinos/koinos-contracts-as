import { System, Protobuf, authority } from "@koinos/sdk-as";
import { getcontractmetadata } from "./proto/getcontractmetadata";

export class Getcontractmetadata {
  get_contract_metadata(
    args: getcontractmetadata.get_contract_metadata_arguments
  ): getcontractmetadata.get_contract_metadata_result {
    // const contract_id = args.contract_id;

    // YOUR CODE HERE

    const res = new getcontractmetadata.get_contract_metadata_result();
    // res.contract_metadata = ;

    return res;
  }
}
