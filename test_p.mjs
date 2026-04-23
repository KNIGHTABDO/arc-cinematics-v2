
import { makeStandardFetcher, buildProviders, targets } from '@movie-web/providers';

async function test() {
  const providers = buildProviders()
    .setTarget(targets.NATIVE)
    .setFetcher(makeStandardFetcher(fetch))
    .addBuiltinProviders()
    .build();

  try {
    console.log('Testing 2embed...');
    const embed = await providers.runSourceScraper({
      media: { type: 'movie', title: 'The Shawshank Redemption', releaseYear: 1994, tmdbId: '278' },
      id: '2embed'
    });
    console.log('Embeds: ' + embed.embeds.length);
    if (embed.embeds.length > 0) {
      const stream = await providers.runEmbedScraper({
        id: embed.embeds[0].embedId,
        url: embed.embeds[0].url
      });
      console.log('SUCCESS:', JSON.stringify(stream.stream[0], null, 2).slice(0, 600));
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
test();
