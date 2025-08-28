import { createEffect, createSignal, onMount } from "solid-js";
import { IResponse } from "../../../../lib/api/api";
import { ICustomerDetails } from "../../../../lib/api/autofetchDetails";
import { IVerifyDetailsResponse } from "../../../../lib/api/verifyDetails";
import { callAdditionalDataProcess } from "../../../../lib/connectionManager/cprApi";
import {
	componentNameConstants,
	dlElementConstants,
	dlEventConstants,
} from "../../../../lib/constant/dataLayerConstants";
import {
	CLEVERTAP_STATIC_VALUES,
	CPR_FORM_DATA_KEY,
	ErrorConstants,
	FORM_INPUT_NAME,
} from "../../../../lib/constant/fpr";
import { logCustomAttributeToNewRelicWithAppData } from "../../../../lib/logging";
import { IFormError, formStore, fprData, setFormStore, updateFprDataValues } from "../../../../lib/signals/fprSignal";
import { showLoaderWithDefaultContent } from "../../../../lib/signals/pageLoaderConfigStore";
import { dataLayer } from "../../../../lib/util/dataLayer";
import { stringToBoolean } from "../../../../lib/util/util";
import { maskDateInput } from "../../../xaop/solid/EMICalculator/emiCalculatorFunctions";
import {
	extractFields,
	generateCtaError,
	generateError,
	generateValue,
	getPrefilledFieldsList,
	handleConsentInsert,
	handlePincode,
	isDateAcceptable,
} from "./FprFormFunctions";
import { IFprForm, IFprFormInputFields, IFprFormTabFields, IFprFormTabFieldsOptions } from "./TypeFprForm";

export const createFprForm = (props: IFprForm) => {
	const [getShowCityPopup, setShowCityPopup] = createSignal<boolean>(false);
	const [getShowProductPopup, setShowProductPopup] = createSignal<boolean>(false);
	const [getOptionalField, setOptionalField] = createSignal<IFprFormInputFields | null>(null);
	const [getCityData, setCityData] = createSignal<IFprFormTabFieldsOptions[]>();

	onMount(() => {
		const readOnlyFields = extractFields(props.inputFields, "readOnly") || [];
		const readOnlyTabs = extractFields(props.tabFields, "readonly") || [];
		const disabledFields = extractFields(props.inputFields, "disabled");
		const mandatoryFields = extractFields(props.inputFields, "mandatory") || [];
		const mandatoryTabs = extractFields(props.tabFields, "mandatory") || [];
		const formStore = localStorage.getItem(CPR_FORM_DATA_KEY);
		if (formStore) {
			setFormStore(JSON.parse(formStore));
		} else {
			setFormStore((prevStore) => ({
				...prevStore,
				readOnlyFields: [...readOnlyFields, ...readOnlyTabs],
				disabledFields: disabledFields,
				mandatoryFields: [...mandatoryFields, ...mandatoryTabs],
			}));
		}
	});

	const onFocus = (name: string) => {
		setFormStore((prevStore) => ({
			...prevStore,
			prefilledFields: [...formStore.prefilledFields.filter((field) => field !== name)],
			ctaError: null,
			error: {
				...formStore.error,
				[name]: null,
			},
		}));
	};

	const onBlur = (e: Event) => {
		const name = (e.target as HTMLInputElement).name;
		const value = (e.target as HTMLInputElement).value;
		const error = generateError(
			value,
			name,
			+props.minYearValidation,
			+props.maxYearValidation,
			+props.maxSalaryValidation,
			Object.values(props.inputFields).find((field) => field.name === name) as IFprFormInputFields,
		);
		!formStore.error[name as keyof IFormError] &&
			setFormStore((prevStore) => ({
				...prevStore,
				prefilledFields: [...formStore.prefilledFields.filter((field) => field !== name)],
				error: {
					...formStore.error,
					[name]: error,
				},
			}));
	};

	const onPanInput = (e: InputEvent) => {
		const target = e.target as HTMLInputElement;
		const name = (e.target as HTMLInputElement).name;
		const value = target.value.slice(0, 10);
		let newValue = "";

		for (let i = 0; i < value.length && i < 10; i++) {
			const char = value[i];
			if (i < 5 || i === 9) {
				if (/[A-Za-z]/.test(char)) newValue += char.toUpperCase();
			} else {
				if (/[0-9]/.test(char)) newValue += char;
			}
		}
		target.inputMode = value.length < 5 || value.length >= 9 ? "text" : "numeric";
		setFormStore((prevStore) => ({
			...prevStore,
			prefilledFields: [...formStore.prefilledFields.filter((field) => field !== target.value)],
			[name]: newValue,
			ctaError: null,
			error: {
				...formStore.error,
				[name]: null,
			},
		}));
		target.value = newValue;
	};

	const onInput = async (e: InputEvent) => {
		const name = (e.target as HTMLInputElement).name;
		const value = generateValue(e, (e.target as HTMLInputElement).value, name);

		setFormStore((prevStore) => ({
			...prevStore,
			prefilledFields: [...formStore.prefilledFields.filter((field) => field !== name)],
			[name]: value,
			ctaError: null,
			error: {
				...formStore.error,
				[name]: null,
			},
		}));

		switch (name) {
			case FORM_INPUT_NAME.PINCODE: {
				if (value.length === 6) {
					const pinCodeError = Object.values(props.inputFields).find((field) => field.name === name)
						?.validationErrorText as string;
					const cityError = Object.values(props.inputFields).find((field) => field.name === FORM_INPUT_NAME.CITY)
						?.validationErrorText as string;
					const cityData = await handlePincode(value, pinCodeError);
					setCityData(cityData.cityList);
					setFormStore((prevStore) => ({
						...prevStore,
						city: cityData.cityList[0]?.label ?? "",
						prefilledFields: cityData.cityList[0]?.label
							? formStore.prefilledFields.filter((field) => field !== FORM_INPUT_NAME.CITY)
							: [...formStore.prefilledFields],
						error: {
							...formStore.error,
							city: cityData.cityList[0]?.label ? null : cityError,
							pinCode: cityData?.error,
						},
					}));
				}
				break;
			}

			default:
				break;
		}
	};

	const onDateInput = (e: InputEvent) => {
		const name = (e.target as HTMLInputElement).name;
		const maskedDate = maskDateInput(e);
		if (isDateAcceptable(maskedDate)) {
			setFormStore((prevStore) => ({
				...prevStore,
				prefilledFields: [...formStore.prefilledFields.filter((field) => field !== name)],
				[name]: maskedDate,
				ctaError: null,
				error: {
					...formStore.error,
					[name]: null,
				},
			}));
		} else {
			(e.target as HTMLInputElement).value = formStore.dob;
		}
	};

	const onTabClickHandler = (value: string, name: string, label: string) => {
		const genderTabDataLayer = {
			component: componentNameConstants.TOGGLE_BUTTONS,
			element: dlElementConstants.TOGGLE_BUTTON_CLICK,
			event: dlEventConstants.CLICK,
			event_type: dlEventConstants.OPTION_SELECTION,
			cta_text: label,
		};
		dataLayer(genderTabDataLayer);
		setFormStore((prevStore) => ({
			...prevStore,
			[name]: value,
			ctaError: null,
			error: {
				...formStore.error,
				[name]: null,
			},
		}));
	};

	const scrollToTargetSection = (firstErrorField: string | boolean | null | undefined) => {
		if (typeof firstErrorField === "boolean") {
			const tncElement = document.querySelector(`[data-name=${props.tncName}]`);
			if (tncElement) {
				tncElement.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		} else if (firstErrorField) {
			let element = document.querySelector(`[name="${firstErrorField}"]`);
			if (!element) {
				element = document.querySelector(`[data-name="${firstErrorField}"]`);
			}
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		}
	};

	const onSubmit = async (ctaText: string) => {
		const inputFields = Object.values(props.inputFields);
		const tabFields = Object.values(props.tabFields);
		const mandatoryFields = [...inputFields, ...tabFields]
			.filter((field) => stringToBoolean(field.mandatory))
			.map((field) => field.name);
		const errorFields = Object.values(formStore.error).filter((field) => {
			return field !== null;
		});
		const emptyFields = Object.entries(formStore).filter(
			(field) =>
				!field[1]?.length && !Array.isArray(field[1]) && mandatoryFields.includes(field[0] as keyof IFormError),
		);
		const errorObj: IFormError = {} as IFormError;
		const stampDataLayer = () => {
			const formSubmitDataLayer = {
				component: componentNameConstants.FORM_SUBMIT_BUTTON,
				element: dlElementConstants.FORM_SUBMIT_BUTTON_CLICK,
				event: dlEventConstants.CLICK,
				event_type: dlEventConstants.BUTTON_CLICK,
				cta_text: ctaText,
			};
			const formCleverTap = {
				EP_JOURNEY_NAME: CLEVERTAP_STATIC_VALUES.JOURNEY_NAME,
				EVENT_NAME: CLEVERTAP_STATIC_VALUES.CPR_APPLICATION_CLICKED,
				EP_PAN: formStore.pan,
				EP_DOB: formStore.dob,
				EP_PINCODE: formStore.pinCode,
				EP_CITY: formStore.city,
				EP_GENDER: formStore.gender,
				EP_EMPLOYMENT_TYPE: formStore.employmentType,
				EP_NET_MONTHLY_SALARY: formStore.netMonthlySalary,
				EP_GSTIN: formStore.gstin,
				EP_LOOKING_FOR: formStore.iAmLookingFor,
				EP_CPR_CUSTOMER_TYPE: CLEVERTAP_STATIC_VALUES.NEW_USER,
				EP_ERROR_FLAG:
					errorFields.length || emptyFields.length || !formStore.tncChecked
						? CLEVERTAP_STATIC_VALUES.YES
						: CLEVERTAP_STATIC_VALUES.NO,
				EP_CHECKBOX: formStore.tncChecked ? CLEVERTAP_STATIC_VALUES.YES : CLEVERTAP_STATIC_VALUES.NO,
				EP_ERROR_MESSAGE:
					generateCtaError(
						errorObj,
						props.ctaSingleErrorText,
						props.ctaMultipleErrorText,
						formStore.tncChecked,
						props.ctaTncErrorText,
					) || CLEVERTAP_STATIC_VALUES.NA,
			};
			logCustomAttributeToNewRelicWithAppData("CPR_BUTTON_CLICK", {
				type: "FORM_SUBMIT_CTA",
				formData: btoa(JSON.stringify(formStore)),
			});
			dataLayer(formSubmitDataLayer, formCleverTap);
		};
		if (errorFields.length || emptyFields.length || !formStore.tncChecked) {
			for (const field of emptyFields) {
				errorObj[field[0] as keyof IFormError] = [...inputFields, ...tabFields].find(
					(inputField) => inputField.name === field[0],
				)?.emptyErrorText as string;
			}
			const firstEmptyField = emptyFields[0]?.[0];
			const firstErrorField = Object.entries(formStore.error).find(([_, value]) => value !== null)?.[0];
			const targetField =
				firstEmptyField || firstErrorField || (!firstEmptyField && !firstErrorField && !formStore.tncChecked);
			if (targetField) {
				scrollToTargetSection(targetField);
			}
			setFormStore((prevStore) => ({
				...prevStore,
				ctaError: generateCtaError(
					errorObj,
					props.ctaSingleErrorText,
					props.ctaMultipleErrorText,
					formStore.tncChecked,
					props.ctaTncErrorText,
				),
				error: {
					...formStore.error,
					...errorObj,
				},
			}));
			stampDataLayer();
			return;
		}
		stampDataLayer();
		showLoaderWithDefaultContent();
		const response = await callAdditionalDataProcess({
			CustomerFullName: formStore.customerFullName,
			Pan: formStore.pan?.toUpperCase(),
			Dob: formStore.dob.split("/").reverse().join("-"),
			pinCode: formStore.pinCode,
			city: formStore.city,
			gender: formStore.gender,
			EmploymentType: formStore.employmentType,
			netMonthlySalary: formStore.netMonthlySalary,
			GSTIN: formStore.gstin?.toUpperCase(),
			Iamlookingfor: formStore.iAmLookingFor,
		});
		handleResponse(response as unknown as IResponse<IVerifyDetailsResponse>);
		handleConsentInsert();
	};

	const onCityClick = (cityItem: IFprFormTabFieldsOptions, placeholder: string, position: string) => {
		setFormStore((prevStore) => ({
			...prevStore,
			prefilledFields: [...formStore.prefilledFields.filter((field) => field !== FORM_INPUT_NAME.CITY)],
			city: cityItem.label,
			error: {
				...formStore.error,
				city: null,
			},
		}));

		dataLayer({
			component: componentNameConstants.FORM_DROPDOWN,
			cta_text: cityItem.label,
			element: dlElementConstants.FORM_DROPDOWN_SELECTION,
			event: dlEventConstants.CLICK,
			event_type: dlEventConstants.OPTION_SELECTION,
			section_title: placeholder,
			tab_position: position,
		});
	};

	const handleTncClick = (e: Event) => {
		const checkboxValue = (e.target as HTMLInputElement).checked;
		setFormStore((prevStore) => ({
			...prevStore,
			tncChecked: checkboxValue,
			ctaError: null,
		}));
	};

	const handleResponse = (response: IResponse<IVerifyDetailsResponse>) => {
		if (response.statusCode === 90) {
			updateFprDataValues({
				response: response,
			});
		} else {
			updateFprDataValues({
				response: undefined,
				errorType: ErrorConstants.VERIFY_DETAILS,
				statusCode: response.statusCode,
			});
		}
	};

	const handleCityPopup = () => {
		if (getCityData()?.length) {
			setShowCityPopup(!getShowCityPopup());
			document.body.classList.toggle("modal-open");
		}
	};

	const handleProductPopup = () => {
		setShowProductPopup(!getShowProductPopup());
		document.body.classList.toggle("modal-open");
	};

	const handleProductClick = (product: IFprFormTabFieldsOptions) => {
		setFormStore((prevStore) => ({
			...prevStore,
			iAmLookingFor: product.label,
		}));
	};

	const handleDropdownDl = (label: string | undefined) => {
		const dropDownDataLayer = {
			component: componentNameConstants.FORM_DROPDOWN,
			element: dlElementConstants.FORM_DROPDOWN_CLICK,
			event: dlEventConstants.CLICK,
			event_type: dlEventConstants.FORM_INTERACTION,
			cta_text: label,
		};
		dataLayer(dropDownDataLayer);
	};

	const handleClear = (e: Event) => {
		const inputElement = (e.target as HTMLElement)
			.closest(".form-input-group")
			?.querySelector("input") as HTMLInputElement;
		if (inputElement) {
			setFormStore((prevStore) => ({
				...prevStore,
				[inputElement.name]: "",
			}));
			inputElement.value = "";
			inputElement.focus();
		}
	};

	/**
	 * Get optional field based on employment type
	 */
	createEffect(() => {
		const employmentObj = Object.values(props.tabFields).find(
			(field) => field.name === "employmentType",
		) as IFprFormTabFields;
		const employmentKey = Object.values(employmentObj.options).find(
			(option) => option.value === formStore.employmentType,
		)?.optionalField as string;
		const optionalField = Object.values(props.inputFields).find(
			(field) => field.name === employmentKey,
		) as IFprFormInputFields;
		setOptionalField(optionalField);
	});

	/**
	 * Prefill user-details from subscription details api response
	 * Opens not editable form if subscription is expired.
	 */
	createEffect(() => {
		const customerDetails = fprData()?.response?.data?.customerDetails as ICustomerDetails;
		const localStorageData = localStorage.getItem(CPR_FORM_DATA_KEY);
		if (customerDetails && !localStorageData) {
			const inputFieldList = Object.values(props.inputFields).map((field) => field.name);
			const tabFields = Object.values(props.tabFields).map((field) => field.name);
			setFormStore((prevStore) => ({
				...prevStore,
				prefilledFields: getPrefilledFieldsList(customerDetails, [...inputFieldList, ...tabFields]),
				customerFullName: customerDetails.customerFullName ?? "",
				dob: customerDetails?.dob?.split("-")?.reverse()?.join("/") ?? "",
				pan: customerDetails.pan ?? "",
				pinCode: customerDetails.pinCode ?? "",
				city: customerDetails.city ?? "",
				gender: customerDetails.gender ?? "",
			}));
		}
	});

	createEffect(() => {
		const formData = { ...formStore };
		localStorage.setItem(CPR_FORM_DATA_KEY, JSON.stringify(formData));
	});

	return {
		getShowCityPopup,
		getShowProductPopup,
		getOptionalField,
		getCityData,
		onFocus,
		onInput,
		onPanInput,
		onDateInput,
		onBlur,
		onCityClick,
		onTabClickHandler,
		onSubmit,
		handleTncClick,
		handleCityPopup,
		handleProductPopup,
		handleProductClick,
		handleDropdownDl,
		handleClear,
		scrollToTargetSection,
		handleResponse,
	};
};
