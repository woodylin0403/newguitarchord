import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "編輯教學",
  robots: { index: false },
};

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          全部
        </Link>
        <span>/</span>
        <span>編輯教學</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          歌譜編輯教學
        </h1>
        <p className="text-sm text-muted">
          怎麼取得編輯權限、怎麼打和弦、怎麼用掃描圖轉譜——照順序看一次就會了。
        </p>
      </header>

      <Section n="1" title="先取得編輯權限">
        <p>
          用右上角「用 Google 登入」註冊帳號後，預設是<Term>待核准</Term>，
          還不能編輯——導覽列頭像旁會有一個「待核准」的小標籤。
        </p>
        <p>
          請管理員到{" "}
          <Link
            href="/admin/users"
            className="text-accent underline underline-offset-2"
          >
            使用者管理
          </Link>{" "}
          把你的帳號按「核准」，之後重新整理頁面，選單就會多出「新增歌曲」。
          有「使用者管理」這個選項的帳號就是管理員。
        </p>
      </Section>

      <Section n="2" title="ChordPro 語法：和弦怎麼打">
        <p>
          每首歌的內容都是純文字，和弦寫在方括號裡，插在它該落下的那個字<b>正前方</b>：
        </p>
        <Pre>{`[C]哦主 [C#m7]我神 [D]你的聖名`}</Pre>
        <p>
          上面這行意思是：唱到「哦」時彈 C，唱到「我」時換 C#m7，唱到「你」時換 D。
        </p>
        <p>
          <b>和弦沒有落在字上、而是落在空白處</b>時（前奏、過門、字與字中間的停頓），
          在和弦後面加一個空白鍵，讓它自己站一格：
        </p>
        <Pre>{`我們讚美你 尊崇你聖名 [C] 將榮耀頌`}</Pre>
        <p>檔案最上面可以加這幾行metadata（每首歌通常都要有）：</p>
        <Pre>{`{title: 你配得至聖尊榮}\n{key: A}\n{time: 4/4}`}</Pre>
        <p>
          多節歌詞用 <Code>{"{start_of_verse: 一}"}</Code>、
          <Code>{"{start_of_verse: 二}"}</Code> 分節；副歌用{" "}
          <Code>{"{start_of_chorus}"}</Code>；段落之間空一行。
        </p>
      </Section>

      <Section n="3" title="和弦鈕（不用手打 [ ]）">
        <p>編輯頁textarea上方那排按鈕，點一下就在游標位置插入對應和弦，分三排：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>本曲</b>——這首已經用過的和弦，最常按這排。</li>
          <li><b>此調</b>——這首原調的六個順階和弦 + 屬七和弦，猜和弦時很好用。</li>
          <li><b>其他</b>——展開後是 12 個根音 × 大/小/7/m7/maj7 全部組合。</li>
        </ul>
        <p>
          旁邊還有一個「␣ 空白」鈕，功能跟上面第 2 點手打空白鍵一樣，插入一個空白給和弦站。
        </p>
      </Section>

      <Section n="4" title="有掃描圖時：對照校對">
        <p>
          如果這首歌已經釘了掃描圖（縮圖選圖器選過），編輯頁右邊那欄會直接顯示
          <b>放大的原稿</b>，跟左邊的文字框並排，方便一邊看圖一邊改和弦位置。
          右上角可以切換「掃描圖 / 預覽」。
        </p>
        <p>還沒選過圖的歌，編輯頁最下面有縮圖選圖器，點一張裁切圖釘上去就好，之後每次進來都會自動顯示。</p>
      </Section>

      <Section n="5" title="從和弦圖轉入（AI 辨識，省打字）">
        <p>
          編輯頁有一個可收合的「從和弦圖轉入」區塊。如果這首已經有釘掃描圖，圖會<b>自動帶入</b>，直接按「轉換」就好。
        </p>
        <p>沒有釘圖的話，用截圖工具框選一張和弦圖、複製，回到頁面直接按 <Code>Ctrl</Code>+<Code>V</Code> 貼上（或點選檔案 / 拖曳）。</p>
        <p>
          按「轉換」後幾秒會出現 ChordPro 文字，按「取代編輯內容」帶進編輯區。
          <b>AI 辨識不是 100% 準，尤其手寫或掃描模糊的譜</b>，一定要對照右邊的掃描圖再檢查一次和弦位置。
        </p>
      </Section>

      <Section n="6" title="參考影片（YouTube，選填）">
        <p>
          編輯頁的「參考影片」區塊可以貼一個 YouTube 連結，讓看譜的人能聽原曲怎麼唱、怎麼彈。
          存了之後歌曲頁會多一個縮圖，點下去才會載入播放器，不影響頁面速度。
        </p>
      </Section>

      <Section n="7" title="存檔、復原、編輯紀錄">
        <p>
          改完按<b>儲存</b>；<b>復原變更</b>是丟掉這次還沒存檔的修改，回到打開編輯頁時的內容。
        </p>
        <p>
          每次儲存都會自動留一筆歷史紀錄，在「編輯紀錄」區塊可以看到誰、什麼時候改的，
          點「比較差異」看跟前一版差在哪裡。管理員可以「還原到此版本」，把內容整個換回去（會再留一筆新紀錄，不會消失）。
        </p>
      </Section>

      <p className="pt-2 text-xs text-muted">
        還是卡住的話，直接把畫面截圖告訴 Claude，比對著看比較快。
      </p>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-t border-border pt-6">
      <h2 className="flex items-baseline gap-2 font-display text-lg font-semibold tracking-tight">
        <span className="font-mono text-sm text-accent">{n}</span>
        {title}
      </h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-foreground [&_b]:font-semibold [&_p]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
      {children}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-3 font-mono text-[12.5px] leading-relaxed text-foreground">
      {children}
    </pre>
  );
}
