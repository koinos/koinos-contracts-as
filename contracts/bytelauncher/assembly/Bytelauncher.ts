import { Protobuf, System, protocol, chain, Base58, StringBytes, error, Crypto, object_spaces } from "@koinos/sdk-as";
import { bytelauncher } from "./proto/bytelauncher";

const MAX_BUFFER_SIZE = 524288; // 512 KiB
const KERNEL_ZONE = new Uint8Array(0);
System.setSystemBufferSize(MAX_BUFFER_SIZE);

export class Bytelauncher {
  upload_contract(args: bytelauncher.upload_contract_arguments): void {
    System.require(System.checkSystemAuthority(), "caller must have system authority to upload contract");

    System.require(args.contract_id, "contract_id is required");
    System.require(args.bytecode_name, "bytecode_name is required");

    const bytestorageAddress = BUILD_FOR_TESTING
      ? Base58.decode("1BTjeKBmPgTarD2Smxw1g7K8kbydcdZVWW")  // harbinger
      : Base58.decode("1GArWiQwb1Wn1yB7VBSUfyhJr4Yv9SW8Pj"); // mainnet

    const callRes = System.call(
      bytestorageAddress,
      0xb61ca37c, // get_bytecode
      Protobuf.encode(
        new bytelauncher.get_bytecode_arguments(args.bytecode_name),
        bytelauncher.get_bytecode_arguments.encode
      )
    );

    if (callRes.code != 0) {
      const errorMessage = `failed to call 'get_bytecode': ${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message : "unknown error"}`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }

    const bytecode = Protobuf.decode<bytelauncher.bytecode>(
      callRes.res.object,
      bytelauncher.bytecode.decode
    );

    System.require(bytecode, `bytecode for "${args.bytecode_name!}" not found`);
    System.require(bytecode.bytecode, `bytecode for "${args.bytecode_name!}" is empty`);
    System.require(bytecode.abi, `ABI for "${args.bytecode_name!}" is empty`);
    System.require(bytecode.bytecode!.length + bytecode.abi!.length <= 524288, `bytecode + ABI for "${args.bytecode_name!}" exceeds maximum size of ${MAX_BUFFER_SIZE} bytes`);

    const op = new protocol.upload_contract_operation(
      args.contract_id!,
      bytecode.bytecode!,
      bytecode.abi!,
      true,
      true,
      true
    );

    System.log(`Uploading contract ${Base58.encode(args.contract_id!)} with "${args.bytecode_name!}" bytecode`);
    System.log(`Bytecode size: ${bytecode.bytecode!.length} bytes`);
    System.log(`ABI size: ${bytecode.abi!.length} bytes`);

    /*
    // The applyUploadContractOperation method throws "account ${account}
    // has not authorized action" despite the fact that the authorize function
    // is available in all system contracts and they use
    // System.checkSystemAuthority() to check the authority.
    // The issue is probably located in the check_authority thunk:
    // The context.get_operation() is probably getting a different
    // operation (the call to bytelaucher.upload_contract instead of
    // the upload contract operation).
    const code = System.applyUploadContractOperation(op);
    if (code != error.error_code.success) {
      // System.revert(`bytelauncher failed to upload "${args.bytecode_name!}" contract: ${System.getErrorMessage()}`);
      System.exit(1, StringBytes.stringToBytes(
        `bytelauncher failed to upload "${args.bytecode_name!}" contract: ${System.getErrorMessage()}`
      ));
    }
    */

    // Instead of using System.applyUploadContractOperation, we can
    // perform the different steps done in this function.

    const hash = System.hash(Crypto.multicodec.sha2_256, op.bytecode);
    const metadata = new chain.contract_metadata_object(
      hash!,
      true, // system contract
      true, // authorizes call contract
      true, // authorizes transaction application
      true  // authorizes upload contract
    );

    // update the bytecode
    System.putBytes(
      new chain.object_space(
        true,
        KERNEL_ZONE,
        object_spaces.system_space_id.contract_bytecode
      ),
      op.contract_id,
      op.bytecode
    );

    // update the metadata
    System.putBytes(
      new chain.object_space(
        true,
        KERNEL_ZONE,
        object_spaces.system_space_id.contract_metadata
      ),
      op.contract_id,
      Protobuf.encode(metadata, chain.contract_metadata_object.encode)
    );

    System.log(`Contract uploaded successfully`);
  }
}
