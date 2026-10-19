import type { CharacterTheme } from "@/lib/character-theme";

type AnimeCharacter = Exclude<CharacterTheme, "sakura" | "kuromi" | "keroppi">;
const styles = {
  vegeta: {
    hair: "#202532",
    outfit: "#2854a0",
    spikes:
      "M25 48 16 23 36 31 31 8 49 24 60 4 71 24 89 8 84 31 104 23 95 48 80 40 60 56 40 40Z",
  },
  naruto: {
    hair: "#edc34e",
    outfit: "#e6802b",
    spikes:
      "M23 49 13 31 29 31 24 15 43 23 47 7 60 19 76 7 78 23 98 15 92 32 108 32 97 49Z",
  },
  kakashi: {
    hair: "#c3cbd5",
    outfit: "#526e52",
    spikes:
      "M23 47 13 28 34 32 24 17 46 23 44 8 64 19 73 5 81 23 103 15 96 34 109 34 96 48Z",
  },
  sasuke: {
    hair: "#27283d",
    outfit: "#777197",
    spikes:
      "M24 58 15 40 28 40 20 23 39 26 43 9 60 20 78 9 82 26 100 23 93 41 105 40 96 58 82 44 73 62 60 45 47 63 37 44Z",
  },
  ichigo: {
    hair: "#e78335",
    outfit: "#29292e",
    spikes:
      "M24 50 13 35 26 30 20 18 39 24 43 8 58 19 71 7 78 23 97 16 94 31 108 34 97 51 84 42 75 54 62 42 48 53 37 43Z",
  },
} satisfies Record<
  AnimeCharacter,
  { hair: string; outfit: string; spikes: string }
>;

/** Small original SVG portraits, kept local and decorative. */
export function AnimeCompanion({
  character,
  className,
}: {
  character: AnimeCharacter;
  className?: string;
}) {
  const style = styles[character];
  const ninja = character === "naruto" || character === "kakashi";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 110"
      fill="none"
      className={className}
    >
      <path
        d="M26 108V99Q30 84 60 84Q90 84 94 99V108Z"
        fill={style.outfit}
        stroke="#302b36"
        strokeWidth="2"
      />
      {character === "vegeta" && (
        <>
          <path d="M32 91 45 86V108H32ZM75 86 88 91V108H75Z" fill="#f3f3eb" />
          <path
            d="M45 91H75V108H45Z"
            fill="#cdb578"
            stroke="#302b36"
            strokeWidth="2"
          />
          <path d="M46 98H74M46 103H74" stroke="#806b45" />
        </>
      )}
      {character === "ichigo" && (
        <path
          d="m40 88 20 20 20-20M48 88l12 12 12-12"
          stroke="#f6f0e8"
          strokeWidth="4"
        />
      )}
      {character === "sasuke" && (
        <path
          d="M34 89 47 80 60 102 73 80 86 89"
          fill="#b4aec9"
          stroke="#302b36"
          strokeWidth="2"
        />
      )}
      <ellipse
        cx="60"
        cy="58"
        rx="34"
        ry="33"
        fill="#f2cfb4"
        stroke="#49383a"
        strokeWidth="2"
      />
      <path
        d={style.spikes}
        fill={style.hair}
        stroke="#302b36"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {ninja && (
        <>
          <path d="M27 40Q60 34 93 40V54Q60 48 27 54Z" fill="#334559" />
          <rect
            x="41"
            y="38"
            width="38"
            height="14"
            rx="3"
            fill="#bfc9d0"
            stroke="#536272"
          />
          <path
            d="M56 48q-5-7 3-7 8 0 5 5-3 4-6 0m-4 1-3 3h8"
            stroke="#536272"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
      <path
        d="m39 60 12 3m18 0 12-3"
        stroke="#49383a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse
        cx="47"
        cy="66"
        rx="3"
        ry="4"
        fill={character === "naruto" ? "#3977af" : "#302b36"}
      />
      <ellipse
        cx="73"
        cy="66"
        rx="3"
        ry="4"
        fill={character === "kakashi" ? "#b44a50" : "#302b36"}
      />
      {character === "kakashi" ? (
        <>
          <path
            d="M27 70Q60 78 93 70Q91 92 60 92Q29 92 27 70Z"
            fill="#334559"
          />
          <path d="M73 55V74" stroke="#9a6970" strokeWidth="1.5" />
        </>
      ) : (
        <path
          d="M53 80Q60 84 67 80"
          stroke="#49383a"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {character === "naruto" && (
        <path
          d="m30 71 10 3m-11 3 11 2m40-5 10-3m-10 8 11-2"
          stroke="#88624e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
      {character === "naruto" && (
        <path d="M60 92V108" stroke="#303642" strokeWidth="4" />
      )}
      {character === "kakashi" && (
        <path d="M45 93V108M75 93V108" stroke="#314933" strokeWidth="3" />
      )}
    </svg>
  );
}
