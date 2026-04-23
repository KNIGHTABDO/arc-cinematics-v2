
import { makeStandardFetcher, buildProviders, targets } from '@movie-web/providers';

async function test() {
  const providers = buildProviders()
    .setTarget(targets.NATIVE)
    .setFetcher(makeStandardFetcher(fetch))
    .addBuiltinProviders()
    .build();

  for (const sourceId of ['streambox', '2embed', 'catflix', 'mp4hydra']) {
    try {
      console.log(`\n=== Testing ${sourceId} ===`);
      const embed = await providers.runSourceScraper({
        media: { type: 'movie', title: 'The Shawshank Redemption', releaseYear: 1994, tmdbId: '278' },
        id: sourceId
      });
      console.log('Embeds found:', embed.embeds.length);
      if (embed.embeds.length > 0) {
        console.log('First embed:', embed.embeds[0].embedId, embed.embeds[0].url.slice(0, 60));
        const stream = await providers.runEmbedScraper({
          id: embed.embeds[0].embedId,
          url: embed.embeds[0].url
        });
        console.log('Stream type:', stream.stream[0]?.type);
        console.log('Stream qualities:', stream.stream[0]?.qualities ? Object.keys(stream.stream[0].qualities) : 'N/A');
        console.log('Playlist:', stream.stream[0]?.playlist?.slice(0, 60) || 'N/A');
        // Print full stream
        console.log('Full stream:', JSON.stringify(stream.stream[0], null, 2).slice(0, 800));
      }
    } catch (e) {
      console.error(`${sourceId} error:`, e.message);
    }
  }
}

test();
