import {PackageErrorCode} from "./package-error-code";

export const ERROR_STRINGS = {
    [PackageErrorCode.AddressMappingDecodingFailure]: "AddressMapping decoding failure",
    [PackageErrorCode.AddressNotAvailable]: "Currency address not available for user",
    [PackageErrorCode.AssetIDNotAvailable]: "AssetID doesn\'t exist in client mapping",
    [PackageErrorCode.BlockstackIdInvalidStructure]: "Invalid Blockstack ID",
    [PackageErrorCode.BlockstackDomainInvalidStructure]: "Invalid Blockstack Domain",
    [PackageErrorCode.BlockstackDomainNamespaceValidation]: "Invalid Blockstack Domain namespace: '{0}', should end with .id",
    [PackageErrorCode.BlockstackIdInvalidSubdomainForTranslation]: "Invalid Blockstack ID, subdomain must be non null to be translated",
    [PackageErrorCode.InvalidBlockstackDomainForTranslation]: "Only Blockstack Domains ending with _crux can be translated",
    [PackageErrorCode.BlockstackIdNamespaceValidation]: "Invalid Blockstack ID namespace: '{0}', should end with .id",
    [PackageErrorCode.BnsEmptyData]: "No name data available",
    [PackageErrorCode.BnsResolutionFailed]: "'{0}' node not available because '{1}'",
    [PackageErrorCode.ExistingCruxIDFound]: "keypair is already used in registration of CruxID: '{0}'",
    [PackageErrorCode.ClientNotInitialized]: "CRUX Client not initialized.",
    [PackageErrorCode.ConfigKeyManagerRequired]: "CruxOnBoardingClient should be instantiated with ConfigKeyManager",
    [PackageErrorCode.CouldNotFindAssetListInClientConfig]: "Missing global asset list",
    [PackageErrorCode.CouldNotFindBlockstackConfigurationServiceClientConfig]: "Missing client-config for: '{0}'",
    [PackageErrorCode.CouldNotFindIdentityKeyPairToPutAddressMapping]: "Missing IdentityKeyPair",
    [PackageErrorCode.CouldNotFindKeyPairToRestoreIdentity]: "Require keypair for restoring the identity",
    [PackageErrorCode.CouldNotFindKeyPairToRegisterName]: "Require keypair for registering name/subdomain",
    // [PackageErrorCode.CouldNotValidateZoneFile]: "Invalid zonefile",
    [PackageErrorCode.CruxDomainInvalidStructure]: "Invalid Crux Domian",
    [PackageErrorCode.CruxDomainNamespaceValidation]: "Invalid Crux Domain namespace: '{0}', should end with .crux",
    [PackageErrorCode.CruxIdNamespaceValidation]: "Invalid Crux ID namespace: '{0}', should end with .crux",
    [PackageErrorCode.CruxIdInvalidStructure]: "Invalid Crux ID",
    [PackageErrorCode.CruxIDUnavailable]: "'{0}' name is unavailable",
    [PackageErrorCode.CurrencyDoesNotExistInClientMapping]: "Currency does not exist in wallet's client mapping",
    [PackageErrorCode.DecryptionFailed]: "Decryption failed",
    [PackageErrorCode.DifferentWalletCruxID]: "Already has a Crux ID registered with different wallet",
    [PackageErrorCode.IsNotSupported]: "Method is not supported",
    [PackageErrorCode.ExpectedEncryptionKeyValue]: "Missing encryptionKey method",
    [PackageErrorCode.FetchPendingRegistrationsByAddressFailed]: "'{0}' failed with error '{1}'",
    [PackageErrorCode.GaiaClientConfigUploadFailed]: "Unable to upload '{0}' to gaia: '{1}'",
    [PackageErrorCode.GaiaCruxPayUploadFailed]: "Unable to upload '{0}' to gaia: '{1}'",
    [PackageErrorCode.GaiaEmptyResponse]: "Gaia sent empty response",
    [PackageErrorCode.GetAddressMapFailed]: "No address found for CRUX ID",
    [PackageErrorCode.GaiaCruxPayGetFailed]: "Unable to get from gaia: '{0}'",
    [PackageErrorCode.GaiaClientConfigGetFailed]: "Unable to get from gaia : '{0}'",
    [PackageErrorCode.GaiaGetFileFailed]: "Unable to get gaia file: '{0}'",
    [PackageErrorCode.GaiaProfileUploadFailed]: "Unable to upload '{0}' to gaia: '{1}'",
    [PackageErrorCode.GaiaUploadFailed]: "Unable to upload '{0}' to gaia: '{1}'",
    [PackageErrorCode.GetNamesByAddressFailed]: "'{0}' failed with error '{1}'",
    [PackageErrorCode.InvalidPrivateKeyFormat]: "Private key should be either hex encoded, base64 encoded or WIF (base58 - compressed) only",
    [PackageErrorCode.KeyPairMismatch]: "Invalid keyPair provided",
    [PackageErrorCode.MissingCruxDomainInCruxOnBoardingClient]: "No domain found with the key provided or missing key in the CruxOnBoardingClient",
    [PackageErrorCode.MissingCruxDomainInCruxWalletClient]: "No domain found with the key provided or missing key in the CruxWalletClient",
    [PackageErrorCode.MissingZoneFile]: "Missing zonefile for: '{0}'",
    [PackageErrorCode.MissingNameOwnerAddress]: "Missing owner address for: '{0}'",
    [PackageErrorCode.NameIntegrityCheckFailed]: "Name resolution integrity check failed",
    [PackageErrorCode.PrivateKeyRequired]: "CruxClient should be intantiated with a private key",
    [PackageErrorCode.SubdomainLengthCheckFailure]: "Validation failed: Subdomain length must be between 4 to 20",
    [PackageErrorCode.SubdomainRegexMatchFailure]: "Validation failed: Subdomain should start with alphabet and end with alphabet or number. Allowed characters are lowercase alphabets, numbers, - and _",
    [PackageErrorCode.SubdomainRegistrationAcknowledgementFailed]: "Register call to registrar failed: '{0}'",
    [PackageErrorCode.SubdomainRegistrationFailed]: "Register call to registrar failed: '{0}'",
    [PackageErrorCode.GaiaRecordIntegrityFailed]: "Gaia record integrity failed for file '{0}' of '{1}'",
    [PackageErrorCode.UserDoesNotExist]: "ID does not exist",
    [PackageErrorCode.IdentityMismatch]: "Identity mismatch",
    [PackageErrorCode.InvalidWalletClientName]: "Invalid Wallet Client Name",
    [PackageErrorCode.InsecureNetworkCall]: "Insecure network call",
    [PackageErrorCode.FailedToGetGaiaUrlFromZonefile]: "Failed to get Gaia URL from user's zonefile: '{0}'",
    [PackageErrorCode.FileNotFound]: "File not Found 404",
};
