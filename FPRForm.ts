import { Component, For, Show } from "solid-js";
import { FORM_FIELDTYPE_MAP, FORM_INPUT_NAME } from "../../../../lib/constant/fpr";
import { IFormError, formStore } from "../../../../lib/signals/fprSignal";
import { isMobile } from "../../../../lib/util/isMobileUtil";
import { objKeyUpdate, stringToBoolean } from "../../../../lib/util/util";
import "../../../xaop/solid/CalculatorButton/calculator-button.scss";
import ListPopup from "../../../xaop/solid/FDSDPCalculator/ListPopup/ListPopup";
import ToolTip from "../../../xaop/solid/ToolTip/ToolTip";
import { capitalFields } from "./FprFormFunctions";
import {
	IDropdownFieldProps,
	IFprFormProps,
	IFprFormTabFieldsOptions,
	IInputFieldProps,
	ITabFieldProps,
} from "./TypeFprForm";
import { createFprForm } from "./createFprForm";
import "./fpr-form.scss";

const InputField: Component<IInputFieldProps> = (props) => (
	<Show when={props.showInput}>
		<div class="form-input-group">
			<div class="flex-row-align-center mb-12">
				<p class="fw-500 flex-row-align-center">{props.title}</p>
				<ToolTip
					toolTipHeaderText={props.toolTipTitle}
					toolTipText={props.toolTipDescription}
					toolTipRTEContent={props.toolTipImage}
					ctaText={props.ctaText}
					isSmallerTooltip
					isFprVariation={true}
				/>
			</div>
			<input
				classList={{
					error: !!props.inputError,
					prefilled: props.isPrefilled,
					padding: props.padding,
					uppercase: capitalFields().includes(props.inputName),
				}}
				type={props.inputType}
				placeholder={props.inputPlaceholder}
				readOnly={props.isReadonly}
				disabled={props.isDisabled}
				name={props.inputName}
				value={props.inputValue}
				onInput={props.onInput}
				onFocus={() => props.onFocus(props.inputName)}
				onBlur={props.onBlur}
				autocomplete={"off"}
			/>
			<Show when={!props?.isDisabled && props?.inputValue?.length}>
				<i class="bf-icon-close input-close fs-12" onClick={props.handleClear} />
			</Show>
			<Show when={!!props.inputError}>
				<p class="fs-12 error-text flex">
					<i class="bf-icon-alert-warning" />
					{props.inputError}
				</p>
			</Show>
			<Show when={props.showPopupIcon}>
				<i class="bf-icon-down-arrow" onClick={props.handleCityPopup} />
			</Show>
			<Show when={props.nudgeText}>
				<p class="nudge fs-10-12">{props.nudgeText}</p>
			</Show>
			<Show when={props.showRupeeSymbol}>
				<p class="rupeesSymbol fs-14-16">{props.rupeeSymbol}</p>
			</Show>
		</div>
	</Show>
);

const TabField: Component<ITabFieldProps> = (props) => (
	<div class="fpr-form__cta-section" data-name={props.tabName}>
		<div class="flex flex-jc-space-btw flex-align-center">
			<p class="fw-500 flex">{props.title}</p>
			<div class="fpr-form__cta-section__buttons flex">
				<For each={props.tabOptions}>
					{(option) => (
						<button
							type="button"
							class="calculator-button"
							classList={{ active: props.tabValue === option.value }}
							onClick={() => {
								props.onTabClickHandler(option.value, props.tabName, option.label);
							}}
						>
							{option.label}
						</button>
					)}
				</For>
			</div>
		</div>
		<Show when={!!props.error}>
			<p class="fs-12 error-text flex">
				<i class="bf-icon-alert-warning" />
				{props.error}
			</p>
		</Show>
	</div>
);

const DropdownField: Component<IDropdownFieldProps> = (props) => (
	<div class="fpr-form__cta-section">
		<p class="fs-14 fw-500 flex fpr-form__cta-section__dropdown-title">{props.title}</p>
		<div
			class="fpr-form__cta-section__dropdown-subtitle flex flex-jc-space-btw fs-12-14"
			onClick={() => {
				props.handleDropdownDl(props.label);
				props.handleProductPopup();
			}}
		>
			{props.label}
			<i class="bf-icon-down-arrow fs-16" />
		</div>
		<Show when={props.getShowProductPopup()}>
			<ListPopup
				handleClose={props.handleProductPopup}
				options={props.dropdownOptions}
				titleText={props.popupTitle}
				variationType={"fpr"}
				handleSelect={props.handleProductClick}
				activeOption={formStore.iAmLookingFor}
				showRadio
			/>
		</Show>
	</div>
);

const FprForm: Component<IFprFormProps> = (props) => {
	const {
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
	} = createFprForm(props.cmpData);
	return (
		<div class="fpr-form flex flex-column" classList={{ "error-padding": !!formStore.ctaError }}>
			<div class="fpr-form__header flex flex-column">
				<h3 class="fs-18">{props.cmpData.title}</h3>
				<p>{props.cmpData.subTitle}</p>
			</div>

			{/* Input Fields */}
			<For each={objKeyUpdate(props.cmpData.inputFields)}>
				{(input) => (
					<>
						{(() => (
							<InputField
								showInput={formStore.mandatoryFields.includes(input.name)}
								title={isMobile ? input.mobileLabel : input.label}
								toolTipTitle={input.toolTipTitle}
								toolTipDescription={input.toolTipDescription}
								toolTipImage={
									input.toolTipImage
										? `<img src=${input.toolTipImage} width=${isMobile ? "100%" : "372"} alt=${
												input.toolTipImageAltText
										  }/>`
										: ""
								}
								ctaText={input.ctaText}
								isPrefilled={formStore.prefilledFields.includes(input.name)}
								isReadonly={formStore.disabledFields.includes(input.name)}
								isDisabled={formStore.disabledFields.includes(input.name)}
								inputError={formStore.error[input.name]}
								inputType={FORM_FIELDTYPE_MAP[input.name as keyof typeof FORM_FIELDTYPE_MAP]}
								inputPlaceholder={input.placeholder}
								inputName={input.name}
								inputValue={formStore[input.name]}
								nudgeText={input.nudgeText}
								showPopupIcon={stringToBoolean(input.disabled) && (getCityData()?.length as number) > 1}
								onInput={
									input.name === FORM_INPUT_NAME.DOB
										? onDateInput
										: input.name === FORM_INPUT_NAME.PAN
										  ? onPanInput
										  : onInput
								}
								onFocus={() => onFocus(input.name)}
								onBlur={(e) => onBlur(e)}
								handleClear={handleClear}
								handleCityPopup={handleCityPopup}
							/>
						))()}
						<Show when={stringToBoolean(input.disabled) && getShowCityPopup()}>
							<For each={getCityData() as IFprFormTabFieldsOptions[]}>
								{(item, index) => (
									<p
										class="fs-14 fd-sdp-cal__popup__option flex flex-align-center"
										onClick={() => {
											onCityClick(item, input.placeholder, index().toString());
										}}
									>
										<input type="radio" class="custom-radio" checked={formStore.iAmLookingFor === item.label} />
										{item.label}
									</p>
								)}
							</For>
						</Show>
					</>
				)}
			</For>

			{/* Tab Fields */}
			<For each={objKeyUpdate(props.cmpData.tabFields)}>
				{(tab) => (
					<TabField
						title={isMobile ? tab.mobileLabel : tab.label}
						tabValue={formStore[tab.name]}
						showError={!!formStore.error[tab.name]}
						error={formStore.error[tab.name]}
						tabName={tab.name}
						tabOptions={objKeyUpdate(tab.options)}
						onTabClickHandler={onTabClickHandler}
					/>
				)}
			</For>

			{/* Salary or GSTIN */}
			<InputField
				showInput={!!getOptionalField()}
				title={(isMobile ? getOptionalField()?.mobileLabel : getOptionalField()?.label) as string}
				toolTipTitle={getOptionalField()?.toolTipTitle as string}
				toolTipDescription={getOptionalField()?.toolTipDescription as string}
				toolTipImage={
					getOptionalField()?.toolTipImage
						? `<img src=${getOptionalField()?.toolTipImage} width=${isMobile ? "100%" : "372"} alt=${
								getOptionalField()?.toolTipImageAltText
						  }/>`
						: ""
				}
				ctaText={getOptionalField()?.ctaText as string}
				padding={
					getOptionalField()?.name === FORM_INPUT_NAME.NET_MONTHLY_SALARY &&
					!!formStore[getOptionalField()?.name as keyof IFormError]
				}
				isPrefilled={formStore.prefilledFields.includes(getOptionalField()?.name as string)}
				isReadonly={formStore.disabledFields.includes(getOptionalField()?.name as string)}
				isDisabled={formStore.disabledFields.includes(getOptionalField()?.name as string)}
				inputError={formStore.error[getOptionalField()?.name as keyof IFormError]}
				inputType={FORM_FIELDTYPE_MAP[getOptionalField()?.name as keyof typeof FORM_FIELDTYPE_MAP]}
				inputPlaceholder={getOptionalField()?.placeholder as string}
				inputName={getOptionalField()?.name as string}
				inputValue={formStore[getOptionalField()?.name as keyof IFormError]}
				nudgeText={getOptionalField()?.nudgeText as string}
				showPopupIcon={false}
				showRupeeSymbol={
					getOptionalField()?.name === FORM_INPUT_NAME.NET_MONTHLY_SALARY &&
					!!formStore[getOptionalField()?.name as keyof IFormError]
				}
				rupeeSymbol={props.cmpData.rupeesSymbol}
				onInput={onInput}
				onFocus={() => onFocus(getOptionalField()?.name as string)}
				onBlur={onBlur}
				handleClear={handleClear}
				handleCityPopup={handleCityPopup}
			/>

			{/* Dropdown Fields */}
			<For each={Object.values(props.cmpData.dropdownFields)}>
				{(dropdown) => (
					<DropdownField
						title={isMobile ? dropdown.mobileLabel : dropdown.label}
						label={formStore.iAmLookingFor.length ? formStore.iAmLookingFor : (dropdown.placeholderText as string)}
						tabName={dropdown.name}
						popupTitle={dropdown.popupTitle}
						getShowProductPopup={getShowProductPopup}
						dropdownOptions={objKeyUpdate(dropdown.options)}
						handleDropdownDl={handleDropdownDl}
						handleProductPopup={handleProductPopup}
						handleProductClick={handleProductClick}
					/>
				)}
			</For>

			<Show when={props.cmpData.tncText}>
				<div class="flex-row-align-center fpr-form__tnc" data-name={props.cmpData.tncName}>
					<input class="custom-checkbox" type="checkbox" onChange={handleTncClick} />
					<div innerHTML={props.cmpData.tncText} />
				</div>
			</Show>

			<div class="flex-column-center fpr-form__submit">
				<Show when={!!formStore.ctaError}>
					<p class="error-text">{formStore.ctaError}</p>
				</Show>
				<button
					type="button"
					class="btn btn--primary"
					onClick={() => {
						onSubmit(props.cmpData.submitCtaText);
					}}
				>
					{props.cmpData.submitCtaText}
				</button>
			</div>
		</div>
	);
};

export default FprForm;
