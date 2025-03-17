import type {
  TestingFrameworkAPICatalog,
  TestingFrameworkAPICatalogItem,
} from "@wix-pilot/core";
import type { TestingFrameworkAPICatalogCategory } from "./types";

export default function extendAPICategories(
  frameworkApiCatalog: TestingFrameworkAPICatalog,
  baseCategories: TestingFrameworkAPICatalogCategory[],
): TestingFrameworkAPICatalogCategory[] {
  return (frameworkApiCatalog.categories = mergeCategories([
    ...frameworkApiCatalog.categories,
    ...baseCategories,
  ]));
}

function mergeCategories(
  categories: TestingFrameworkAPICatalogCategory[],
): TestingFrameworkAPICatalogCategory[] {
  return categories.reduce((mergedCategories, category) => {
    const existingIndex = mergedCategories.findIndex(
      (c) => c.title === category.title,
    );

    const uniqueItems = (items: TestingFrameworkAPICatalogItem[]) =>
      Array.from(new Set(items));

    if (existingIndex >= 0) {
      mergedCategories[existingIndex].items = uniqueItems([
        ...mergedCategories[existingIndex].items,
        ...category.items,
      ]);
      return mergedCategories;
    } else {
      category.items = uniqueItems(category.items);
    }

    return [...mergedCategories, { ...category }];
  }, [] as TestingFrameworkAPICatalogCategory[]);
}
