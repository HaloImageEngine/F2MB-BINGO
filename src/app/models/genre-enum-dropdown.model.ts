import { LookupOption } from './lookup-option.model';

/** Row from `GET …/Bingo/Lookups/Get_DropDown_Genre_Enum`. */
export interface GenreEnumDropdown {
  ID: number;
  Category: string;
  Description: string | null;
  Sequence: number | null;
}

export function genreEnumToLookupOption(item: GenreEnumDropdown): LookupOption {
  return {
    Id: item.ID,
    Name: item.Category
  };
}
