import { TravelImage } from "@/components/common/TravelImage";
import { formatStat } from "@/lib/utils/format";
import type { UserProfile } from "@/types";

interface ProfilePanelProps {
  profile: UserProfile;
}

/**
 * Identity card that floats over the globe.
 *
 * Three numbers only. Follower counts and other social signals are deliberately absent -
 * this profile is about where someone has been, not how many people watched.
 */
export function ProfilePanel({ profile }: ProfilePanelProps) {
  const { statistics } = profile;

  return (
    <section aria-label="프로필" className="panel w-full p-5 lg:w-[280px]">
      <div className="flex items-center gap-3">
        <TravelImage
          src={profile.profileImageUrl}
          alt={`${profile.displayName} 프로필 이미지`}
          fallbackLabel={profile.username.slice(0, 2)}
          className="border-border-subtle h-12 w-12 shrink-0 rounded-full border object-cover"
        />
        <div className="min-w-0">
          <h1 className="text-content truncate text-[1.05rem] font-medium tracking-tight">
            {profile.displayName}
          </h1>
          <p className="text-content-faint truncate font-mono text-[0.76rem]">
            @{profile.username}
          </p>
        </div>
      </div>

      {profile.bio ? (
        <p className="text-body mt-4 text-[0.85rem] leading-relaxed">{profile.bio}</p>
      ) : null}

      <dl className="border-border-subtle mt-5 grid grid-cols-3 gap-2 border-t pt-4">
        <Stat label="Countries" value={statistics.countryCount} />
        <Stat label="Cities" value={statistics.cityCount} />
        <Stat label="Trips" value={statistics.travelCount} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="eyebrow text-[0.62rem]">{label}</dt>
      <dd className="stat-figure text-content mt-1.5 text-[1.6rem]">{formatStat(value)}</dd>
    </div>
  );
}
