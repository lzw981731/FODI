/**
 * Parses a file path into its components.
 * @param filePath The file path to parse.
 * @param prefixToRemove An optional prefix to remove from the path.
 * @param keepTrailingSlash Whether to keep the trailing slash.
 * @returns An object containing path, parent, and tail.
 */
export function parsePath(filePath: string, prefixToRemove?: string, keepTrailingSlash?: boolean) {
  if (!keepTrailingSlash && filePath.endsWith('/')) {
    filePath = filePath.slice(0, -1);
  }

  if (filePath.includes('://')) {
    filePath = decodeURIComponent(new URL(filePath).pathname);
  }

  if (prefixToRemove && filePath.startsWith(prefixToRemove)) {
    filePath = filePath.slice(prefixToRemove.length);
  }

  return {
    path: filePath,
    parent: filePath.split('/').slice(0, -1).join('/'),
    tail: filePath.split('/').pop(),
  };
}

/**
 * Builds a URI path for a file.
 * @param filePath The file path to build the URI for.
 * @param exposePath The exposed path prefix.
 * @param apiUrl The API base URL, if empty string return `:path:`
 * @returns The constructed URI path.
 */
export function buildUriPath(filePath: string, exposePath: string, apiUrl: string) {
  let itemPath = (exposePath + parsePath(filePath).path).replace(/\/+/g, '/');
  if (itemPath.startsWith('/')) {
    itemPath = itemPath.slice(1);
  }
  const uri = itemPath
    ? `${apiUrl}:${itemPath.split('/').map(encodeURIComponent).join('/')}:`
    : apiUrl;
  return uri;
}
