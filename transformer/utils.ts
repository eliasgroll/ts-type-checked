import path from 'path';
import ts from 'typescript';

export const createIsPlainObjectCheck = (value: ts.Expression): ts.Expression =>
  ts.createLogicalAnd(
    ts.createParen(ts.createStrictEquality(ts.createTypeOf(value), ts.createStringLiteral('object'))),
    ts.createParen(ts.createStrictInequality(value, ts.createNull())),
  );

// Creates a check for all explicitly defined properties of a type
export const createObjectPropertiesCheck = (
  typeChecker: ts.TypeChecker,
  typeNode: ts.TypeLiteralNode,
  propertyTypeCheck: (typeNode: ts.TypeNode, value: ts.Expression) => ts.Expression,
  value: ts.Expression,
): ts.Expression | undefined => {
  // const type: ts.Type = typeChecker.getTypeFromTypeNode(typeNode);
  // const properties: ts.Symbol[] = type.getProperties();
  // if (!properties || properties.length === 0) return undefined;

  return ts.createFalse();

  // return typeNode?.members
  //   .map(memberTypeElement => {
  //     if (ts.isPropertySignature(memberTypeElement)) {
  //       console.warn('\tProperty signature');

  //       if (memberTypeElement.type === undefined) {
  //         throw new Error(`Could not find type of property ${memberTypeElement.name}`);
  //       }

  //       const propertyAccess = ts.createElementAccess(
  //         value,
  //         ts.createStringLiteral(memberTypeElement.name?.),
  //       );
  //       const checkForType = propertyTypeCheck(memberTypeElement.type, propertyAccess);
  //       const checkForUndefined = memberTypeElement.questionToken
  //         ? ts.createStrictEquality(ts.createTypeOf(propertyAccess), ts.createIdentifier('undefined'))
  //         : undefined;

  //       if (checkForUndefined) return ts.createLogicalOr(checkForUndefined, checkForType);

  //       return checkForType;
  //     }

  //     // if (memberTypeElement.name === undefined || !ts.isIdentifier(memberTypeElement.name)) {
  //     //   throw new Error('Only supports explicit properties');
  //     // }

  //     // const memberTypeElementType = typeChecker.getTypeAtLocation(memberTypeElement.name);
  //     // const memberTypeElementTypeNode = memberTypeElementType
  //     //   ? typeChecker.typeToTypeNode(memberTypeElementType, typeNode)
  //     //   : undefined;
  //     // if (!memberTypeElementTypeNode) {
  //     //   throw new Error('Could not resolve property type');
  //     // }

  //     // const propertyAccess = ts.createElementAccess(value, memberTypeElement.name);
  //     // const checkForType = propertyTypeCheck(memberTypeElementTypeNode, propertyAccess);
  //     // const checkForUndefined = memberTypeElement.questionToken
  //     //   ? ts.createStrictEquality(ts.createTypeOf(propertyAccess), ts.createIdentifier('undefined'))
  //     //   : undefined;

  //     // if (checkForUndefined) return ts.createLogicalOr(checkForUndefined, checkForType);

  //     // return checkForType;

  //     // retuer

  //     return ts.createFalse();
  //   })
  //   .reduce((expression, propertyCheck) => ts.createLogicalAnd(expression, propertyCheck));

  // const propertyChecks = properties.map<ts.Expression>(property => {
  //   const propertyType = typeChecker.getTypeOfSymbolAtLocation(property, typeNode);
  //   const propertyTypeNode = typeChecker.typeToTypeNode(propertyType, typeNode);
  //   if (!propertyTypeNode) {
  //     throw new Error(`Could not determine the type of property ${property.getName()} of type`);
  //   }

  //   console.warn('\t\tproperty type', property.getName(), propertyTypeNode.kind);

  //   const propertyAccess = ts.createElementAccess(value, ts.createStringLiteral(property.name));
  //   const valueTypeCheck = propertyTypeCheck(propertyTypeNode, propertyAccess);

  //   // return createLogicalAnd(typeCheckExpression, createParen(createLogicalOr(optionalCheck, valueTypeCheck)));
  //   return ts.createParen(valueTypeCheck);
  // });

  // return propertyChecks.reduce((expression, propertyCheck) => ts.createLogicalAnd(expression, propertyCheck));
};

// Creates a check for indexed access properties
// export const createObjectIndexedPropertiesCheck = (
//   typeChecker: ts.TypeChecker,
//   createValueTypeCheck: IsACallVisitor,
//   typeNode: ts.TypeReferenceNode | ts.TypeLiteralNode,
//   value: ts.Expression,
// ): ts.Expression | undefined => {
//   const type = typeChecker.getTypeFromTypeNode(typeNode);
//   const numberIndexType = type.getNumberIndexType();
//   const stringIndexType = type.getStringIndexType();
//   const numberIndexTypeNode = numberIndexType ? typeChecker.typeToTypeNode(numberIndexType) : undefined;
//   const stringIndexTypeNode = stringIndexType ? typeChecker.typeToTypeNode(stringIndexType) : undefined;
//   debugger;
//   if (!numberIndexTypeNode && !stringIndexTypeNode) return undefined;

//   const properties: ts.Symbol[] = type.getProperties() || [];
//   const propertyMapIdentifier = ts.createIdentifier('properties');

//   // Map of explicitly defined properties
//   const propertyMap = ts.createVariableStatement(
//     undefined /* modifiers */,
//     ts.createVariableDeclarationList(
//       [
//         ts.createVariableDeclaration(
//           propertyMapIdentifier,
//           undefined,
//           ts.createObjectLiteral(
//             properties.map(property => {
//               return ts.createPropertyAssignment(ts.createStringLiteral(property.getName()), ts.createTrue());
//             }),
//             true,
//           ),
//         ),
//       ],
//       ts.NodeFlags.Const,
//     ),
//   );

//   // Object.keys(value).every(key => {
//   //   // Both are defined
//   //   return (!isNaN(value[key]) && isA<NumberType>(value[key])) || isA<StringType>(value[key]);

//   //   // StringType is defined
//   //   return false || isA<StringType>(value[key]);

//   //   // NumberType is defined
//   //   return (!isNaN(value[key]) && isA<NumberType>(value[key])) || true;

//   //   // isNaN(value[key]) ? 7 : 1;
//   //   // // If numberIndexTypeNode is defined
//   //   // if (!isNaN(value[key])) return isA<NumberType>(value[key]);

//   //   // // If stringIndexTypeNode
//   //   // return isA<StringType>(value[key]);
//   // })

//   // The Object.keys(value) call
//   const objectKeysCall = ts.createCall(ts.createPropertyAccess(ts.createIdentifier('Object'), 'keys'), [], [value]);

//   // Callback parameter for the .every(key => {}) call
//   const key = ts.createIdentifier('key');

//   // value[key] access
//   const valueForKey = ts.createElementAccess(value, key);

//   // !isNaN(key) && isA<NumberType>(value[key])
//   const numberIndexTypeCheck: ts.Expression = numberIndexTypeNode
//     ? ts.createLogicalAnd(
//         ts.createPrefix(
//           ts.SyntaxKind.ExclamationToken,
//           ts.createCall(ts.createIdentifier('isNaN'), undefined /* typeParameters */, [key] /* argumentsArray */),
//         ),
//         createValueTypeCheck(numberIndexTypeNode, valueForKey),
//       )
//     : ts.createFalse();

//   // isA<StringType>(value[key])
//   const stringIndexTypeCheck: ts.Expression = stringIndexTypeNode
//     ? createValueTypeCheck(stringIndexTypeNode, valueForKey)
//     : ts.createFalse();

//   const checkKey = ts.createFunctionExpression(
//     undefined /* modifiers */,
//     undefined /* asteriskToken */,
//     undefined /* name */,
//     undefined /* typeParameters */,
//     [
//       ts.createParameter(
//         undefined /* decorators */,
//         undefined /* modifiers */,
//         undefined /* dotDotDotToken */,
//         key /* name */,
//         undefined /* questionToken */,
//         undefined /* type */,
//         undefined /* initializer */,
//       ),
//     ],
//     undefined,
//     ts.createBlock(
//       [
//         // If numberIndexTypeNode is defined we need to check whether a key is numberic
//         // which in case of plain objects means the key is still a string but can be converted to a number
//         propertyMap,

//         // If the property has been defined explicitly then we skip it
//         ts.createIf(ts.createElementAccess(propertyMapIdentifier, key), ts.createReturn(ts.createTrue())),

//         // If it is an indexed property then it is checked using the checks above
//         ts.createReturn(ts.createLogicalOr(ts.createParen(numberIndexTypeCheck), ts.createParen(stringIndexTypeCheck))),
//       ],
//       false,
//     ),
//   );

//   return ts.createCall(ts.createPropertyAccess(objectKeysCall, 'every'), [], [checkKey]);
// };

// Array.isArray(value) && value.every(element => isA(element))
export const createArrayElementsCheck = (
  value: ts.Expression,
  elementTypeCheck: (value: ts.Expression) => ts.Expression,
): ts.Expression => {
  // First let's do Array.isArray(value)
  const isArray = ts.createCall(ts.createPropertyAccess(ts.createIdentifier('Array'), 'isArray'), [], [value]);

  // Then let's define a element type checker function that can be passed to Array.every
  const element = ts.createIdentifier('element');
  const checkElement = ts.createFunctionExpression(
    undefined /* modifiers */,
    undefined /* asteriskToken */,
    undefined /* name */,
    undefined /* typeParameters */,
    [
      ts.createParameter(
        undefined /* decorators */,
        undefined /* modifiers */,
        undefined /* dotDotDotToken */,
        element /* name */,
        undefined /* questionToken */,
        undefined /* type */,
        undefined /* initializer */,
      ),
    ],
    undefined,
    ts.createBlock([ts.createReturn(elementTypeCheck(element))], false),
  );

  // Now let's do value.every(<element type checker>)
  const checkElements = ts.createCall(ts.createPropertyAccess(value, 'every'), [], [checkElement]);

  return ts.createLogicalAnd(isArray, checkElements);
};

export const createTypeCheckerFunction = (
  comparison: (valueNode: ts.Identifier) => ts.Expression,
): ts.FunctionExpression => {
  const value: ts.Identifier = ts.createIdentifier('value');

  return ts.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    [
      ts.createParameter(
        /* decorators */ undefined,
        /* modifiers */ undefined,
        /* dotDotDotToken */ undefined,
        /* name */ value,
        undefined,
        undefined,
        undefined,
      ),
    ],
    undefined,
    ts.createBlock([ts.createReturn(comparison(value))], false),
  );
};

const indexJs = path.join(__dirname, '..', 'index.js');
export const isOurImportExpression = (node: ts.Node): node is ts.ImportDeclaration => {
  if (!ts.isImportDeclaration(node)) {
    return false;
  }

  try {
    const module = (node.moduleSpecifier as ts.StringLiteral).text;

    return (
      indexJs ===
      (module.startsWith('.')
        ? require.resolve(path.resolve(path.dirname(node.getSourceFile().fileName), module))
        : require.resolve(module))
    );
  } catch (e) {
    return false;
  }
};

// Whether this is an actual call of arbitraryOf<T>
const indexTs = path.join(__dirname, '..', 'index.d.ts');
export const isOurCallExpression = (
  node: ts.Node,
  name: string,
  typeChecker: ts.TypeChecker,
): node is ts.CallExpression => {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const signature = typeChecker.getResolvedSignature(node);
  if (typeof signature === 'undefined') {
    return false;
  }

  const { declaration } = signature;
  return (
    !!declaration &&
    !ts.isJSDocSignature(declaration) &&
    path.join(declaration.getSourceFile().fileName) === indexTs &&
    !!declaration.name &&
    declaration.name.getText() === name
  );
};

export const isTypeReference = (type: ts.Type): type is ts.TypeReference => {
  const { node, target } = type as ts.TypeReference;

  // FIXME Maybe more checks on the target
  if (!target) return false;
  if (node && !ts.isTypeNode(node)) return false;

  return true;
};

export const typeFlags = (type: ts.Type): string[] => {
  return Object.keys(ts.TypeFlags).filter(flagName => !!((ts.TypeFlags[flagName as any] as any) & type.flags));
};
