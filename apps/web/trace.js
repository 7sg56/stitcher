const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const mapRaw = fs.readFileSync('.next/server/chunks/ssr/[root-of-the-server]__0r._p_0._.js.map', 'utf8');

SourceMapConsumer.with(mapRaw, null, consumer => {
  const pos = consumer.originalPositionFor({
    line: 1,
    column: 3588
  });
  console.log(pos);
});
