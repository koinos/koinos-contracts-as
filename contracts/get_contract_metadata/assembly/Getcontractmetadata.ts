import { System, chain, object_spaces } from "@koinos/sdk-as";
import { getcontractmetadata } from "./proto/getcontractmetadata";

export class Getcontractmetadata {
  get_contract_metadata(
    args: getcontractmetadata.get_contract_metadata_arguments
  ): getcontractmetadata.get_contract_metadata_result {
    const contractMetadataSpace = new chain.object_space(
      true, 
      // kernel zone is "empty bytes"
      new Uint8Array(0), 
      object_spaces.system_space_id.contract_metadata
    );

    return new getcontractmetadata.get_contract_metadata_result(
      System.getObject<Uint8Array, chain.contract_metadata_object>(contractMetadataSpace, args.contract_id, chain.contract_metadata_object.decode)
    );
  }
}
