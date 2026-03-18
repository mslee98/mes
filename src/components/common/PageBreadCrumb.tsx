import { Link } from "react-router";
import { ChevronLeftIcon } from "../../icons";
import useGoBack from "../../hooks/useGoBack";

interface BreadcrumbProps {
  pageTitle: string;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle }) => {
  const goBack = useGoBack();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center justify-center rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="뒤로 가기"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
        <h2
          className="text-xl font-semibold text-gray-800 dark:text-white/90"
          x-text="pageName"
        >
          {pageTitle}
        </h2>
      </div>
      <nav>
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
              to="/"
            >
              Home
              <svg
                className="stroke-current"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                  stroke=""
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </li>
          <li className="text-sm text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
