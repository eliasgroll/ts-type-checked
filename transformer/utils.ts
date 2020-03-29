import { ValueTypeCheckCreator } from './visitor';
import path from 'path';
import ts from 'typescript';

export const getTypeOf = (typeNode: ts.TypeNode): string | undefined => {
  switch (typeNode.kind) {
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean';

    case ts.SyntaxKind.NumberKeyword:
      return 'number';

    case ts.SyntaxKind.ObjectKeyword:
      return 'object';

    case ts.SyntaxKind.StringKeyword:
      return 'string';

    case ts.SyntaxKind.UndefinedKeyword:
      return 'undefined';

    case ts.SyntaxKind.FunctionType:
      console.warn('Due to the nature of functions their return types cannot be checked');

      return 'function';

    default:
      return undefined;
  }
};

export const createIsPlainObjectCheck = (value: ts.Expression): ts.Expression =>
  ts.createLogicalAnd(
    ts.createParen(ts.createStrictEquality(ts.createTypeOf(value), ts.createStringLiteral('object'))),
    ts.createParen(ts.createStrictInequality(value, ts.createNull())),
  );

// Creates a check for all explicitly defined properties of a type
export const createObjectPropertiesCheck = (
  typeChecker: ts.TypeChecker,
  createValueTypeCheck: ValueTypeCheckCreator,
  typeNode: ts.TypeReferenceNode | ts.TypeLiteralNode,
  value: ts.Expression,
): ts.Expression | undefined => {
  const type: ts.Type = typeChecker.getTypeFromTypeNode(typeNode);
  const properties: ts.Symbol[] = type.getProperties();
  if (!properties || properties.length === 0) return undefined;

  const propertyChecks = properties.map<ts.Expression>(property => {
    const propertyType = typeChecker.getTypeOfSymbolAtLocation(property, typeNode);
    const propertyTypeNode = typeChecker.typeToTypeNode(propertyType);
    if (!propertyTypeNode) {
      throw new Error(`Could not determine the type of property ${property.getName()} of type`);
    }

    console.warn('\t\tproperty type', property.getName(), propertyTypeNode.kind);

    const propertyAccess = ts.createElementAccess(value, ts.createStringLiteral(property.name));
    const valueTypeCheck = createValueTypeCheck(propertyTypeNode, propertyAccess);

    // return createLogicalAnd(typeCheckExpression, createParen(createLogicalOr(optionalCheck, valueTypeCheck)));
    return ts.createParen(valueTypeCheck);
  });

  return propertyChecks.reduce((expression, propertyCheck) => ts.createLogicalAnd(expression, propertyCheck));
};

// Creates a check for indexed access properties
export const createObjectIndexedPropertiesCheck = (
  typeChecker: ts.TypeChecker,
  createValueTypeCheck: ValueTypeCheckCreator,
  typeNode: ts.TypeReferenceNode | ts.TypeLiteralNode,
  value: ts.Expression,
): ts.Expression | undefined => {
  const type = typeChecker.getTypeFromTypeNode(typeNode);
  const numberIndexType = type.getNumberIndexType();
  const stringIndexType = type.getStringIndexType();
  const numberIndexTypeNode = numberIndexType ? typeChecker.typeToTypeNode(numberIndexType) : undefined;
  const stringIndexTypeNode = stringIndexType ? typeChecker.typeToTypeNode(stringIndexType) : undefined;
  if (!numberIndexTypeNode && !stringIndexTypeNode) return undefined;

  const properties: ts.Symbol[] = type.getProperties() || [];
  const propertyMapIdentifier = ts.createIdentifier('properties');

  // Map of explicitly defined properties
  const propertyMap = ts.createVariableStatement(
    undefined /* modifiers */,
    ts.createVariableDeclarationList(
      [
        ts.createVariableDeclaration(
          propertyMapIdentifier,
          undefined,
          ts.createObjectLiteral(
            properties.map(property => {
              return ts.createPropertyAssignment(ts.createStringLiteral(property.getName()), ts.createTrue());
            }),
            true,
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

  // Object.keys(value).every(key => {
  //   // Both are defined
  //   return (!isNaN(value[key]) && isA<NumberType>(value[key])) || isA<StringType>(value[key]);

  //   // StringType is defined
  //   return false || isA<StringType>(value[key]);

  //   // NumberType is defined
  //   return (!isNaN(value[key]) && isA<NumberType>(value[key])) || true;

  //   // isNaN(value[key]) ? 7 : 1;
  //   // // If numberIndexTypeNode is defined
  //   // if (!isNaN(value[key])) return isA<NumberType>(value[key]);

  //   // // If stringIndexTypeNode
  //   // return isA<StringType>(value[key]);
  // })

  // The Object.keys(value) call
  const objectKeysCall = ts.createCall(ts.createPropertyAccess(ts.createIdentifier('Object'), 'keys'), [], [value]);

  // Callback parameter for the .every(key => {}) call
  const key = ts.createIdentifier('key');

  // value[key] access
  const valueForKey = ts.createElementAccess(value, key);

  // !isNaN(key) && isA<NumberType>(value[key])
  const numberIndexTypeCheck: ts.Expression = numberIndexTypeNode
    ? ts.createLogicalAnd(
        ts.createPrefix(
          ts.SyntaxKind.ExclamationToken,
          ts.createCall(ts.createIdentifier('isNaN'), undefined /* typeParameters */, [key] /* argumentsArray */),
        ),
        createValueTypeCheck(numberIndexTypeNode, valueForKey),
      )
    : ts.createFalse();

  // isA<StringType>(value[key])
  const stringIndexTypeCheck: ts.Expression = stringIndexTypeNode
    ? createValueTypeCheck(stringIndexTypeNode, valueForKey)
    : ts.createTrue();

  const checkKey = ts.createFunctionExpression(
    undefined /* modifiers */,
    undefined /* asteriskToken */,
    undefined /* name */,
    undefined /* typeParameters */,
    [
      ts.createParameter(
        undefined /* decorators */,
        undefined /* modifiers */,
        undefined /* dotDotDotToken */,
        key /* name */,
        undefined /* questionToken */,
        undefined /* type */,
        undefined /* initializer */,
      ),
    ],
    undefined,
    ts.createBlock(
      [
        // If numberIndexTypeNode is defined we need to check whether a key is numberic
        // which in case of plain objects means the key is still a string but can be converted to a number
        propertyMap,

        // If the property has been defined explicitly then we skip it
        ts.createIf(ts.createElementAccess(propertyMapIdentifier, key), ts.createReturn(ts.createTrue())),

        // If it is an indexed property then it is checked using the checks above
        ts.createReturn(ts.createLogicalOr(ts.createParen(numberIndexTypeCheck), ts.createParen(stringIndexTypeCheck))),
      ],
      false,
    ),
  );

  ts.createExpressionStatement(
    ts.createBinary(
      ts.createParen(
        ts.createBinary(
          ts.createPrefix(
            ts.SyntaxKind.ExclamationToken,
            ts.createCall(ts.createIdentifier('isNaN'), undefined, [
              ts.createElementAccess(ts.createIdentifier('value'), ts.createIdentifier('key')),
            ]),
          ),
          ts.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
          ts.createCall(
            ts.createIdentifier('isA'),
            [ts.createTypeReferenceNode(ts.createIdentifier('NumberType'), undefined)],
            [ts.createElementAccess(ts.createIdentifier('value'), ts.createIdentifier('key'))],
          ),
        ),
      ),
      ts.createToken(ts.SyntaxKind.BarBarToken),
      ts.createCall(
        ts.createIdentifier('isA'),
        [ts.createTypeReferenceNode(ts.createIdentifier('StringType'), undefined)],
        [ts.createElementAccess(ts.createIdentifier('value'), ts.createIdentifier('key'))],
      ),
    ),
  );

  const checkKeys = ts.createCall(ts.createPropertyAccess(objectKeysCall, 'every'), [], [checkKey]);
};

// Create an empty object declaration
export const addTypeCheckerMap = (
  file: ts.SourceFile,
  identifier: ts.Identifier,
  properties: ts.PropertyAssignment[],
): ts.SourceFile => {
  return ts.updateSourceFileNode(file, [
    ts.createVariableStatement(/* modifiers */ undefined, [
      ts.createVariableDeclaration(
        identifier,
        /* type */ undefined,
        ts.createObjectLiteral(/* properties */ properties, /* multiline */ true),
      ),
    ]),
    ...file.statements,
  ]);
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
