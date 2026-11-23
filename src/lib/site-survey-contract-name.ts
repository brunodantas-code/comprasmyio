/** New registrations follow the facade name until the contract is edited independently. */
export function surveyContractName(shopName: string, contractName: string, automatic: boolean): string {
  return automatic ? shopName : contractName;
}