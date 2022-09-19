import { System, Protobuf, authority } from "@koinos/sdk-as";
import { govtest } from "./proto/govtest";

export class Govtest {
  example(args: govtest.example_arguments): govtest.example_result {
    // YOUR CODE HERE

    const res = new govtest.example_result();

    return res;
  }
}
