'use client';

import {
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import { formatUkTaxYearLabelForDisplay } from '@/domain/services/uk-tax-year';

import { buttonPrimaryClassName, buttonSecondaryClassName } from '@/app/ui/button-variants';

import { TaxYearPanel } from './calculation-result-detail';

const TAX_YEAR_TAB_SCROLL_ID = 'calc-tax-year-tab-scroll';

type CalculationTaxYearTabsProps = {
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly holdingSymbol: string;
  readonly pdfBusy: boolean;
  readonly onExportThisTaxYear: (group: CalculationTransactionTableGroup) => void;
};

export function CalculationTaxYearTabs({
  groups,
  holdingSymbol,
  pdfBusy,
  onExportThisTaxYear,
}: CalculationTaxYearTabsProps): ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [showMoreYears, setShowMoreYears] = useState(false);

  const updateMoreYearsVisibility = useCallback((): void => {
    const el = tabScrollRef.current;
    if (el === null) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const eps = 2;
    const hasOverflow = scrollWidth > clientWidth + eps;
    const notAtRightEdge = scrollLeft + clientWidth < scrollWidth - eps;
    setShowMoreYears(hasOverflow && notAtRightEdge);
  }, []);

  useEffect(() => {
    const el = tabScrollRef.current;
    if (el === null) {
      return;
    }

    updateMoreYearsVisibility();
    el.addEventListener('scroll', updateMoreYearsVisibility);
    const ro = new ResizeObserver(() => {
      updateMoreYearsVisibility();
    });
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateMoreYearsVisibility);
      ro.disconnect();
    };
  }, [groups, updateMoreYearsVisibility]);

  if (groups.length === 0) {
    return <p className="mt-3 text-sm text-neutral-600">No events.</p>;
  }

  const selected = groups[selectedIndex];
  if (selected === undefined) {
    return <p className="mt-3 text-sm text-neutral-600">No events.</p>;
  }

  const handleTabKeyDown = (index: number, event: KeyboardEvent<HTMLButtonElement>): void => {
    const n = groups.length;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % n;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + n) % n;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = n - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    setSelectedIndex(nextIndex);
    requestAnimationFrame(() => {
      tabRefs.current[nextIndex]?.focus();
    });
  };

  return (
    <div className="mt-4">
      <div className="flex min-w-0 items-stretch gap-1">
        <div
          ref={tabScrollRef}
          id={TAX_YEAR_TAB_SCROLL_ID}
          className="-mx-1 min-w-0 flex-1 overflow-x-auto overflow-y-hidden px-1 pb-px"
        >
          <div
            className="flex min-w-min flex-nowrap gap-0.5 border-b border-neutral-200"
            role="tablist"
            aria-label="Tax years"
            aria-orientation="horizontal"
          >
          {groups.map((g, i) => {
            const tabId = `calc-ty-tab-${g.taxYearLabel}`;
            const panelId = `calc-ty-panel-${g.taxYearLabel}`;
            const label = formatUkTaxYearLabelForDisplay(g.taxYearLabel);
            const isSelected = i === selectedIndex;

            return (
              <button
                key={g.taxYearLabel}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={isSelected}
                aria-controls={panelId}
                tabIndex={isSelected ? 0 : -1}
                className={`shrink-0 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-neutral-50 font-semibold text-neutral-900'
                    : 'border-transparent font-medium text-neutral-600 hover:bg-neutral-50/80 hover:text-neutral-900'
                }`}
                onClick={() => {
                  setSelectedIndex(i);
                }}
                onKeyDown={(e) => {
                  handleTabKeyDown(i, e);
                }}
              >
                {label}
              </button>
            );
          })}
          </div>
        </div>
        {showMoreYears ? (
          <button
            type="button"
            className={`${buttonSecondaryClassName} mb-px shrink-0 self-end whitespace-nowrap text-xs sm:text-sm`}
            aria-controls={TAX_YEAR_TAB_SCROLL_ID}
            aria-label="Scroll tax years right"
            onClick={() => {
              const el = tabScrollRef.current;
              if (el === null) {
                return;
              }
              const remaining = el.scrollWidth - el.scrollLeft - el.clientWidth;
              el.scrollBy({
                left: Math.min(200, Math.max(remaining, 0)),
                behavior: 'smooth',
              });
            }}
          >
            More years →
          </button>
        ) : null}
      </div>

      <div
        className="mt-4"
        role="tabpanel"
        id={`calc-ty-panel-${selected.taxYearLabel}`}
        aria-labelledby={`calc-ty-tab-${selected.taxYearLabel}`}
      >
        <TaxYearPanel
          group={selected}
          holdingSymbol={holdingSymbol}
          pdfToolbar={
            <button
              type="button"
              className={buttonPrimaryClassName}
              disabled={pdfBusy}
              aria-busy={pdfBusy}
              onClick={() => {
                onExportThisTaxYear(selected);
              }}
            >
              Export this tax year (PDF)
            </button>
          }
        />
      </div>
    </div>
  );
}
