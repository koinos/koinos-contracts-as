import { System, Protobuf, system_calls } from "@koinos/sdk-as";
import { govtest } from "./proto/govtest";

export class Govtest {
  post_block_callback(args: system_calls.post_block_callback_arguments): system_calls.post_block_callback_result {
    
    const res = new system_calls.post_block_callback_result();

    const event = new govtest.post_block_callback_event();
    System.event('govtest.post_block_callback_event', Protobuf.encode(event, govtest.post_block_callback_event.encode), []);

    return res;
  }
}
