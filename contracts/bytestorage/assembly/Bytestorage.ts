import { Protobuf, System, Storage } from "@koinos/sdk-as";
import { bytestorage } from "./proto/bytestorage";

System.setSystemBufferSize(524288);

export class Bytestorage {
  contractId: Uint8Array = System.getContractId();

  bytecode: Storage.Map<string, bytestorage.bytecode> = new Storage.Map(
    this.contractId,
    0,
    bytestorage.bytecode.decode,
    bytestorage.bytecode.encode
  );
  
  get_bytecode(args: bytestorage.get_bytecode_arguments): bytestorage.bytecode {
    const bytecode = this.bytecode.get(args.name!);
    if (!bytecode) System.fail(`bytecode ${args.name!} does not exist`);
    return bytecode!;
  }

  save_bytecode(args: bytestorage.bytecode): void {
    let bytecode = this.bytecode.get(args.name!);
    System.require(!bytecode, `bytecode ${args.name!} already exists`);
    System.require(
      args.name!.length > 0 &&
      args.bytecode!.length > 0 &&
      args.abi!.length > 0,
      "invalid arguments"
    );
    this.bytecode.put(args.name!, args);
    System.event(
      "bytestorage.set_bytecode_event",
      Protobuf.encode(
        new bytestorage.get_bytecode_arguments(args.name),
        bytestorage.get_bytecode_arguments.encode
      ),
      []
    );
  }
}
