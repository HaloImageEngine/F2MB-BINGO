import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

type Trend = 'up' | 'down' | 'flat';
type OverviewGameType = 'FML' | 'FRN';

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: Trend;
  note: string;
}

interface ActivityItem {
  time: string;
  owner: string;
  detail: string;
}

interface ReadinessItem {
  label: string;
  status: 'ready' | 'watch' | 'risk';
  note: string;
}

interface PipelineStage {
  stage: string;
  status: string;
  detail: string;
}

interface SpotlightStat {
  label: string;
  value: string;
}

interface OverviewContent {
  tag: string;
  title: string;
  subtitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroCopy: string;
  chips: string[];
  chipsAriaLabel: string;
  spotlightStats: SpotlightStat[];
  metrics: Metric[];
  activityEyebrow: string;
  activityTitle: string;
  activityFeed: ActivityItem[];
  readinessEyebrow: string;
  readinessTitle: string;
  readinessChecks: ReadinessItem[];
  pipelineEyebrow: string;
  pipelineTitle: string;
  pipeline: PipelineStage[];
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly gameType = toSignal(
    this.route.queryParamMap.pipe(map(params => this.normalizeType(params.get('type')))),
    { initialValue: 'FML' as OverviewGameType }
  );

  readonly content = computed(() => this.buildContent(this.gameType()));

  private normalizeType(value: string | null): OverviewGameType {
    const normalized = value?.trim().toUpperCase();
    return normalized === 'FRN' ? 'FRN' : 'FML';
  }

  private buildContent(type: OverviewGameType): OverviewContent {
    return type === 'FRN' ? this.friendsContent() : this.familyContent();
  }

  private familyContent(): OverviewContent {
    return {
      tag: 'Family Bingo',
      title: 'Turn holidays and reunions into game night',
      subtitle:
        'Play music bingo with the people you love — at Thanksgiving dinner, Christmas morning, a summer cookout, or any family gathering around the living room.',
      heroEyebrow: "Tonight's gathering",
      heroTitle: "Cards are out, the playlist is rolling, and everyone's in",
      heroCopy:
        'Family Bingo replaces numbers with song snippets everyone knows. Pass out printed cards or pull them up on phones, hit play, and let cousins, grandparents, and kids compete for family-friendly prizes until the blackout winner is crowned.',
      chips: ['All ages welcome', 'Print or phone cards', 'Holiday playlists ready'],
      chipsAriaLabel: 'Family bingo highlights',
      spotlightStats: [
        { label: 'Current round', value: 'Round 2 · Holiday Favorites' },
        { label: 'Now playing', value: 'Mariah Carey — All I Want for Christmas Is You' },
        { label: 'Win pattern', value: 'Four corners with free center' }
      ],
      metrics: [
        {
          label: 'Players at the table',
          value: '12 family members',
          change: '+3 cousins just arrived',
          trend: 'up',
          note: 'Living room and kitchen tables both in play'
        },
        {
          label: 'Songs queued',
          value: '25 holiday hits',
          change: '5 sing-along picks ready',
          trend: 'up',
          note: 'Mix of classics, pop, and family favorites'
        },
        {
          label: 'Room energy',
          value: '10 / 10',
          change: 'Dance area open for the center square',
          trend: 'flat',
          note: 'Create a dance area for the kids to dance to their favorite song and get the free square marked. The middle free square is not free and must have the participant dance at least 20 seconds of one song to get the free square.'
        },
        {
          label: 'Prizes',
          value: 'Family-oriented gifts',
          change: 'Gift cards, Kisses, and more',
          trend: 'flat',
          note: 'Prizes can be small gift cards or bag of Kisses chocolate or any other Family Oriented gift that will please the players and have them invested in the game.'
        }
      ],
      activityEyebrow: "Tonight's moments",
      activityTitle: 'Family game log',
      activityFeed: [
        {
          time: '6:12 PM',
          owner: 'Mom',
          detail: 'Printed cards for everyone and queued the holiday playlist for Round 2.'
        },
        {
          time: '6:05 PM',
          owner: 'Uncle Joe',
          detail: 'Called the first three songs — cousins are already singing along.'
        },
        {
          time: '5:58 PM',
          owner: 'Aunt Lisa',
          detail: 'Set up the prize table with gift cards, bags of Kisses, and other family-friendly treats.'
        },
        {
          time: '5:44 PM',
          owner: 'Grandpa',
          detail: 'Won the first line bingo and picked a bag of Kisses.'
        }
      ],
      readinessEyebrow: 'Before you start',
      readinessTitle: 'Gathering checklist',
      readinessChecks: [
        {
          label: 'Speakers & screen',
          status: 'ready',
          note: 'TV or laptop hooked up so everyone can hear the song clips'
        },
        {
          label: 'Extra cards',
          status: 'watch',
          note: 'Keep a few blank boards handy for late arrivals'
        },
        {
          label: 'Snacks & prizes',
          status: 'ready',
          note: 'Small gift cards, bags of Kisses chocolate, or other family-oriented gifts that keep players invested'
        },
        {
          label: 'Kid-friendly dabbers',
          status: 'risk',
          note: 'Grab crayons or stickers if the little ones join in'
        }
      ],
      pipelineEyebrow: 'How the night goes',
      pipelineTitle: 'Game flow',
      pipeline: [
        {
          stage: 'Arrivals & Hellos',
          status: 'Complete',
          detail: 'Everyone checked in, cards passed out, and snacks on the table'
        },
        {
          stage: 'Warm-Up Round',
          status: 'Complete',
          detail: 'Easy first round got the whole room comfortable with the rules'
        },
        {
          stage: 'Holiday Sing-Along',
          status: 'Live',
          detail: 'Classic holiday tracks running — mark the artist when you hear them'
        },
        {
          stage: 'Blackout Finale',
          status: 'Queued',
          detail: 'Full-card winner takes the top prize after the last song'
        }
      ]
    };
  }

  private friendsContent(): OverviewContent {
    return {
      tag: 'Family and Friends',
      title: 'A smaller game for your inner circle',
      subtitle:
        'Family and Friends Bingo is built for a small group — a few relatives, close friends, or neighbors getting together without the big holiday crowd. Think living-room hangouts, backyard nights, or a casual weekend round with people you know well.',
      heroEyebrow: 'Small-group setup',
      heroTitle: 'Light footprint, easy to run, still plenty of fun',
      heroCopy:
        'This mode keeps the game intimate. Print between 30 and 50 cards total, deal each player 3 to 5 cards per inning, and run shorter rounds that fit a smaller room. Song clips stay familiar, the caller pace stays relaxed, and everyone stays in the game without needing a large crowd or big prize table.',
      chips: ['30–50 cards max', '3–5 cards per player', 'Smaller rounds'],
      chipsAriaLabel: 'Family and friends bingo highlights',
      spotlightStats: [
        { label: 'Card pool', value: '30–50 cards for the night' },
        { label: 'Cards per player', value: '3–5 cards each inning' },
        { label: 'Current round', value: 'Round 1 · Friend Favorites' }
      ],
      metrics: [
        {
          label: 'Players in the room',
          value: '6 friends',
          change: 'Perfect size for one table',
          trend: 'flat',
          note: 'Small enough that everyone hears every song clearly'
        },
        {
          label: 'Cards in play',
          value: '42 cards',
          change: 'Within the 30–50 card range',
          trend: 'up',
          note: 'Each player holding 4 cards this inning'
        },
        {
          label: 'Round length',
          value: 'Short & social',
          change: '3–5 cards keeps pacing light',
          trend: 'flat',
          note: 'Easy to swap cards between innings'
        },
        {
          label: 'Prizes',
          value: '2 treats left',
          change: 'Low-key rewards work great here',
          trend: 'down',
          note: 'Snacks, drinks, or bragging rights are enough'
        }
      ],
      activityEyebrow: 'Tonight so far',
      activityTitle: 'Small-group game log',
      activityFeed: [
        {
          time: '7:18 PM',
          owner: 'Host',
          detail: 'Printed 40 cards and split them into stacks of 4 for Round 1.'
        },
        {
          time: '7:11 PM',
          owner: 'Alex',
          detail: 'Queued a shorter playlist geared to the group’s favorite artists.'
        },
        {
          time: '7:04 PM',
          owner: 'Jordan',
          detail: 'Helped new players learn the 3–5 card per inning rule.'
        },
        {
          time: '6:56 PM',
          owner: 'Sam',
          detail: 'Won the first line and picked the dessert round prize.'
        }
      ],
      readinessEyebrow: 'Quick prep',
      readinessTitle: 'Small-group checklist',
      readinessChecks: [
        {
          label: 'Card count',
          status: 'ready',
          note: 'Stay within 30–50 total cards so the pool matches your group size'
        },
        {
          label: 'Cards per player',
          status: 'ready',
          note: 'Deal 3–5 cards each inning so rounds stay manageable'
        },
        {
          label: 'Speaker check',
          status: 'ready',
          note: 'One screen or speaker is usually enough for a small room'
        },
        {
          label: 'Extra boards',
          status: 'watch',
          note: 'Keep a few spare cards in case someone wants another inning'
        }
      ],
      pipelineEyebrow: 'How the evening flows',
      pipelineTitle: 'Round flow',
      pipeline: [
        {
          stage: 'Setup',
          status: 'Complete',
          detail: 'Cards printed, playlist picked, and 3–5 cards dealt to each player'
        },
        {
          stage: 'Inning One',
          status: 'Live',
          detail: 'First small-group round running with a 30–50 card pool'
        },
        {
          stage: 'Inning Two',
          status: 'Queued',
          detail: 'Swap to a fresh set of 3–5 cards and keep the same friendly pace'
        },
        {
          stage: 'Wrap-Up',
          status: 'Queued',
          detail: 'Last round, quick winner, and back to visiting'
        }
      ]
    };
  }
}
