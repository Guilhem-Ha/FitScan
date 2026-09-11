// Keeps React Native's OkHttp client working on networks with broken IPv6.
//
// By default RN builds its client with connectTimeout(0), i.e. no limit. On a
// network that hands out IPv6 addresses without routing IPv6, Android tries
// the AAAA address first and the SYN never gets an answer: fetch() hangs
// until our AbortController fires, and OkHttp never moves on to IPv4.
//
// A short connect timeout alone is not enough: googleapis.com resolves to
// six or more AAAA records, which Android lists before every A record, so
// OkHttp burns 5 s on each dead IPv6 address before reaching IPv4. The DNS
// lookup therefore interleaves the families, IPv4 first (as Happy Eyeballs,
// RFC 8305, does), so one working family is at most one timeout away.
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
      'import java.net.Inet4Address',
      'import java.net.InetAddress',
      'import java.util.concurrent.TimeUnit',
      'import okhttp3.Dns',
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
      '          .dns(object : Dns {',
      '            override fun lookup(hostname: String): List<InetAddress> {',
      '              val (ipv4, ipv6) = Dns.SYSTEM.lookup(hostname).partition { it is Inet4Address }',
      '              return (0 until maxOf(ipv4.size, ipv6.size)).flatMap { i ->',
      '                listOfNotNull(ipv4.getOrNull(i), ipv6.getOrNull(i))',
      '              }',
      '            }',
      '          })',
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
