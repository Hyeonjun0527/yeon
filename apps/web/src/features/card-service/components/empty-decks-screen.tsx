interface EmptyDecksScreenProps {
  onCreate: () => void;
}

export function EmptyDecksScreen({ onCreate }: EmptyDecksScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e5e5] py-20 text-center">
      <h3 className="text-[18px] font-semibold text-[#111]">
        아직 덱이 없습니다
      </h3>
      <p className="mt-2 text-[14px] text-[#666]">
        첫 덱을 만들고 학습할 카드를 추가해보세요.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 rounded-xl bg-[#111] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#333]"
      >
        첫 덱 만들기
      </button>
    </div>
  );
}
