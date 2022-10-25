import { chain, Protobuf, System, name_service, error } from "@koinos/sdk-as";

namespace Constants {
  export const NAME = "Name Service";

  let contractId: Uint8Array | null = null;

  export function ContractId() : Uint8Array {
    if (contractId === null) {
      contractId = System.getContractId();
    }

    return contractId!;
  }
}

namespace State {
  export namespace Space {
    export const NAME2ADDRESS = new chain.object_space(true, Constants.ContractId(), 0);
    export const ADDRESS2NAME = new chain.object_space(true, Constants.ContractId(), 1);
  }
}

export class NameService {
  set_record(args: name_service.set_record_arguments): name_service.set_record_result {
    System.requireSystemAuthority();

    const name = args.name!;
    const address = args.address!;

    const a_record = new name_service.address_record(args.address);
    const n_record = new name_service.name_record(args.name);
    
    // Created array to track impacted addresses
    let impacted = new Array<Uint8Array>(1);
    impacted[0] = address;

    // Check for and handle old address record
    const old_a_record = System.getObject<string, name_service.address_record>(State.Space.NAME2ADDRESS, name, name_service.address_record.decode);
    if (old_a_record !== null) {
      System.removeObject<Uint8Array>(State.Space.ADDRESS2NAME, old_a_record.address!);
      // Add old address to impacted if it is not equal to the new address
      if (!impacted.includes(old_a_record.address!)) {
        impacted.push(old_a_record.address!);
      }
    }

    // Check for and handle old name record
    const old_n_record = System.getObject<Uint8Array, name_service.name_record>(State.Space.ADDRESS2NAME, address, name_service.name_record.decode);
    if (old_n_record !== null) {
      System.removeObject<string>(State.Space.NAME2ADDRESS, old_n_record.name!);
    }

    // Set new records
    System.putObject(State.Space.NAME2ADDRESS, name, a_record, name_service.address_record.encode);
    System.putObject(State.Space.ADDRESS2NAME, address, n_record, name_service.name_record.encode);

    // Emit event
    let event = new name_service.record_update_event();
    event.name = name;
    event.address = address;
    System.event('koinos.contracts.record_update_event', Protobuf.encode(event, name_service.record_update_event.encode), impacted);

    return new name_service.set_record_result();
  }

  get_address(args: name_service.get_address_arguments): name_service.get_address_result {
    const record = System.getObject<string, name_service.address_record>(State.Space.NAME2ADDRESS, args.name!, name_service.address_record.decode);
    System.require(record != null, 'no record found for the given name');
    return new name_service.get_address_result(record);
  }

  get_name(args: name_service.get_name_arguments): name_service.get_name_result {
    const record = System.getObject<Uint8Array, name_service.name_record>(State.Space.ADDRESS2NAME, args.address!, name_service.name_record.decode);
    System.require(record != null, 'no record found for the given address');
    return new name_service.get_name_result(record);
  }
}
