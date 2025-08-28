import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { ICustomerDetails } from "../../../../lib/api/autofetchDetails";
import { consentLoginInsert } from "../../../../lib/api/consentLoginApi";
import { getProductByPincode } from "../../../../lib/api/getProductByPincode";
import {
	dobAcceptanceRegex,
	fullNameAcceptanceRegex,
	fullNameValidationRegex,
	gstinValidationRegex,
	panAcceptanceRegex,
	panValidationRegex,
	pincodeAcceptanceRegex,
	pincodeValidationRegex,
} from "../../../../lib/constant/validation";
import { IFormError, IFprFormStore, formStore } from "../../../../lib/signals/fprSignal";
import { getSessionData, stringToBoolean } from "../../../../lib/util/util";
import { IFprFormInputFields, IFprFormTabFields } from "./TypeFprForm";
dayjs.extend(customParseFormat);

const isValueAcceptable = (value: string, name: string): boolean =>
	({
		customerFullName: fullNameAcceptanceRegex.test(value) && value.length <= 50,
		pan: panAcceptanceRegex.test(value) && value.length <= 10,
		pinCode: pincodeAcceptanceRegex.test(value) && value.length <= 6,
		dob: isDateAcceptable(value),
		netMonthlySalary: pincodeAcceptanceRegex.test(value) && value.length <= 7,
		gstin: panAcceptanceRegex.test(value) && value.length <= 15,
	})[name] as boolean;

const isValueValid = (
	value: string,
	name: string,
	minYearValidation: number,
	maxYearValidation: number,
	maxSalaryValidation: number,
): boolean =>
	({
		customerFullName: fullNameValidationRegex.test(value),
		pan: panValidationRegex.test(value.toUpperCase()),
		pinCode: pincodeValidationRegex.test(value),
		dob: isDateValid(value, minYearValidation, maxYearValidation),
		netMonthlySalary: !value || (+value > 0 && +value <= maxSalaryValidation),
		gstin: !value.length || gstinValidationRegex.test(value.toUpperCase()),
	})[name] as boolean;

export const capitalFields = () => ["pan", "gstin"];

export const generateValue = (e: Event, value: string, name: string): string => {
	let returnValue = formStore[name as keyof IFprFormStore];
	if (isValueAcceptable(value, name)) {
		returnValue = value;
	} else {
		(e.target as HTMLInputElement).value = returnValue as string;
	}
	return returnValue as string;
};

export const generateError = (
	value: string,
	name: string,
	minYearValidation: number,
	maxYearValidation: number,
	maxSalaryValidation: number,
	inputProps: IFprFormInputFields,
): string | null => {
	let error = null;
	if (!value.length && formStore.mandatoryFields.includes(name)) {
		error = inputProps.emptyErrorText;
	} else if (!isValueValid(value, name, minYearValidation, maxYearValidation, maxSalaryValidation)) {
		error = inputProps.validationErrorText;
	}
	return error;
};

export const handlePincode = async (value: string, error: string) => {
	const response = await getProductByPincode(value);
	const pincodeError = response.statusCode === 90 ? null : error;
	const cityList = response.statusCode === 90 ? [{ label: response.data.cityName, value: response.data.cityName }] : [];
	return {
		cityList: cityList,
		error: pincodeError,
	};
};

export const extractFields = (
	inputFields: { [key: string]: IFprFormInputFields } | { [key: string]: IFprFormTabFields },
	key: string,
) =>
	Object.values(inputFields)
		.filter((field) => stringToBoolean(field[key]))
		.map((field) => field.name);

export const isDateValid = (dateString: string, minYearValidation: number, maxYearValidation: number): boolean => {
	let returnValue = false;
	const [day, month, year] = dateString.split("/");
	if (day && month && year && new Date(+year, +month - 1, +day) && dayjs(dateString, "DD/MM/YYYY", true).isValid()) {
		const minYear = new Date(new Date().getFullYear() - minYearValidation, +month - 1, +day);
		const maxYear = new Date(new Date().getFullYear() - maxYearValidation, +month - 1, +day);
		const inputYear = new Date(+year, +month - 1, +day);
		returnValue = inputYear <= minYear && maxYear <= inputYear;
	}
	return returnValue;
};

export const isDateAcceptable = (dateString: string): boolean => {
	let returnValue = true;
	const [day, month, year] = dateString.split("/");
	if (day && (+day > 31 || !pincodeAcceptanceRegex.test(day))) {
		returnValue = false;
	}
	if (month && (+month > 12 || !pincodeAcceptanceRegex.test(month))) {
		returnValue = false;
	}
	if (year && (year.length >= 5 || !pincodeAcceptanceRegex.test(year))) {
		returnValue = false;
	}
	if (!dobAcceptanceRegex.test(dateString) || dateString.split("/").length > 3) {
		returnValue = false;
	}
	return returnValue;
};

export const getPrefilledFieldsList = (fprData: ICustomerDetails, inputNameList: string[]): string[] => {
	const prefillList: string[] = [];
	for (const item of inputNameList) {
		fprData[item as keyof ICustomerDetails]?.length && prefillList.push(item);
	}
	return prefillList;
};

export const generateCtaError = (
	errorObj: IFormError,
	ctaSingleErrorText: string,
	ctaMultipleErrorText: string,
	isTncChecked: boolean,
	ctaTncErrorText: string,
): string | null => {
	let ctaError = null;
	const totalErrors = Object.values(errorObj).length;
	if (totalErrors === 1) {
		ctaError = ctaSingleErrorText;
	} else if (totalErrors > 1) {
		ctaError = ctaMultipleErrorText;
	} else if (!isTncChecked) {
		ctaError = ctaTncErrorText;
	}
	return ctaError;
};

export const handleConsentInsert = async () => {
	const { mobileNo } = await getSessionData();
	const consentIdList = ["TnC-CPR", "EXPERIAN-CPR"];
	const consentStatus = "Y";
	consentLoginInsert(mobileNo, consentIdList, consentStatus);
};
