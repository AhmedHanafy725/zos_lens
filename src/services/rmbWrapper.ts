import { Client as RMBClient } from '@threefold/rmb_direct_client';

class RMBWrapper {
  private client: RMBClient;

  constructor(rmbClient: RMBClient) {
    this.client = rmbClient;
  }

  /**
   * Send an RMB request and wait for the response
   * @param cmd - The command to execute
   * @param payload - The payload data (string or JSON string)
   * @param destinationTwinId - The twin ID to send the request to
   * @param expiration - Request expiration time in minutes (default: 60)
   * @param retries - Number of retries (default: 1)
   * @returns Promise<unknown> - The response from the RMB call
   */
  async request(
    cmd: string, 
    payload: string, 
    destinationTwinId: number, 
    expiration = 60, 
    retries = 1
  ): Promise<unknown> {
    try {
      // First: send the command and get a request ID
      const requestId = await this.client.send(cmd, payload, destinationTwinId, expiration / 60, retries);
      
      // Second: read the result using the request ID
      const result = await this.client.read(requestId);
      
      return result;
    } catch (error) {
      console.error(
        `Failed to send RMB request to twin ${destinationTwinId} with command: ${cmd}, payload: ${payload}`,
        error
      );
      throw new Error(
        `RMB request failed for command "${cmd}" to twin ${destinationTwinId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export { RMBWrapper };
