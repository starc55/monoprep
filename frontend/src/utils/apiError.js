export function getApiErrorMessage(error, fallbackMessage) {
  const fieldErrors = error?.response?.data?.details?.fieldErrors;
  const firstFieldMessage = fieldErrors
    ? Object.values(fieldErrors).flat().find(Boolean)
    : null;

  return firstFieldMessage || error?.response?.data?.message || fallbackMessage;
}
