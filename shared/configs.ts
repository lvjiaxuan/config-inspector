import type { Linter } from 'eslint'
import { minimatch } from 'minimatch'
import type { FlatConfigItem, MatchedFile } from './types'

export function getMatchedGlobs(file: string, glob: (Linter.FlatConfigFileSpec | Linter.FlatConfigFileSpec[])[]) {
  const globs = (Array.isArray(glob) ? glob : [glob]).flat()
  return globs.filter(glob => typeof glob === 'function' ? glob(file) : minimatch(file, glob)).flat()
}

const META_KEYS = new Set(['name', 'index'])

/**
 * Config with only `ignores` property
 */
export function isIgnoreOnlyConfig(config: FlatConfigItem) {
  const keys = Object.keys(config).filter(i => !META_KEYS.has(i))
  return keys.length === 1 && keys[0] === 'ignores'
}

/**
 * Config without `files` and `ignores` properties or with only `ignores` property
 */
export function isGeneralConfig(config: FlatConfigItem) {
  return (!config.files && !config.ignores) || isIgnoreOnlyConfig(config)
}

export function matchFile(
  filepath: string,
  configs: FlatConfigItem[],
  ignoreOnlyConfigs: FlatConfigItem[],
): MatchedFile {
  const globalIgnored = ignoreOnlyConfigs.flatMap(config => getMatchedGlobs(filepath, config.ignores!))
  if (globalIgnored.length) {
    return {
      filepath,
      globs: globalIgnored,
      configs: [],
    }
  }

  const result: MatchedFile = {
    filepath,
    globs: [],
    configs: [],
  }
  configs.forEach((config, index) => {
    const positive = getMatchedGlobs(filepath, config.files || [])
    const negative = getMatchedGlobs(filepath, config.ignores || [])
    if (!negative.length && positive.length)
      result.configs.push(index)
    result.globs.push(
      ...positive,
      ...negative,
    )
  })
  return result
}
