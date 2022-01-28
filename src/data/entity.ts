/** Every entity in our single DynamoDB table will implement this interface */
export interface DynamoEntity {
  pk: string; // Primary key
  sk: string; // Sort key
  sk2: number; // LSI sort key
}
