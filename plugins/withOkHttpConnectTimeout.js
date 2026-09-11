// Gives React Native's OkHttp client a connect timeout.
//
// By default RN builds its client with connectTimeout(0), i.e. no limit. On a
// network that hands out IPv6 addresses without routing IPv6, Android tries
// the AAAA address first and the SYN never gets an answer: fetch() hangs
// until our AbortController fires, and OkHttp never moves on to the IPv4
// route. With a short connect timeout, OkHttp gives up on the dead route and
// retries on the next one.
const { withMainApplication } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const CONNECT_TIMEOUT_SECONDS = 5;

function addOkHttpFactory(src) {
  if (!src.includes('super.onCreate()')) {
    throw new Error('withOkHttpConnectTimeout: super.onCreate() not found in MainApplication.kt');
  }

  const withImports = mergeContents({
    src,
    newSrc: [
      'import com.facebook.react.modules.network.OkHttpClientProvider',
      'import java.util.concurrent.TimeUnit',
    ].join('\n'),
    tag: 'okhttp-connect-timeout-imports',
    anchor: /^import android\.app\.Application$/m,
    offset: 1,
    comment: '//',
  }).contents;

  return mergeContents({
    src: withImports,
    newSrc: [
      '    OkHttpClientProvider.setOkHttpClientFactory {',
      '      OkHttpClientProvider.createClientBuilder(applicationContext)',
      `          .connectTimeout(${CONNECT_TIMEOUT_SECONDS}L, TimeUnit.SECONDS)`,
      '          .build()',
      '    }',
    ].join('\n'),
    tag: 'okhttp-connect-timeout',
    anchor: /super\.onCreate\(\)/,
    offset: 1,
    comment: '//',
  }).contents;
}

module.exports = function withOkHttpConnectTimeout(config) {
  return withMainApplication(config, (config) => {
    if (config.modResults.language !== 'kt') {
      throw new Error('withOkHttpConnectTimeout: only a Kotlin MainApplication is supported');
    }
    config.modResults.contents = addOkHttpFactory(config.modResults.contents);
    return config;
  });
};
