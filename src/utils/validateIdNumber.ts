const weight = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

function validateIdNumber(idNumber: string) {
  const splittedNumbers = idNumber.split("").map(Number);
  const total = splittedNumbers
    .slice(0, 12)
    .map((number, index) => number * weight[index])
    .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  const mod11 = total % 11;
  return splittedNumbers[12] === (11 - mod11) % 10;
}

export default validateIdNumber;
