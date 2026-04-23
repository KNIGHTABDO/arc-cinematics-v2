
import { makeStandardFetcher, buildProviders, targets } from '@movie-web/providers';

async function test() {
  const providers = buildProviders()
    .setTarget(targets.NATIVE)
    .setFetcher(makeStandardFetcher(fetch))
    .addBuiltinProviders()
    .build();

  try {
    console.log('Testing streambox...');
    const start = Date.now();
    const embed = await providers.runSourceScraper({
      media: { type: 'movie', title: 'The Shawshank Redemption', releaseYear: 1994, tmdbId: '278' },
      id: 'streambox'
    });
    console.log('Source scraper took:', Date.now() - start, 'ms');
    console.log('Embeds:', embed.embeds.length);
    if (embed.embeds.length > 0) {
      console.log('Embed:', embed.embeds[0].embedId, embed.embeds[0].url.slice(0, 60));
      const sstart = Date.now();
      const stream = await providers.runEmbedScraper({
        id: embed.embeds[0].embedId,
        url: embed.embeds[0].url
      });
      console.log('Embed scraper took:', Date.now() - sstart, 'ms');
      console.log('Stream:', JSON.stringify(stream.stream[0], null, 2).slice(0, 1000));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
